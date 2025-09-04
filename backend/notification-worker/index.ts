import { Kafka } from "kafkajs";
import { Resend } from "resend";
import twilio from "twilio";
import { smsTemplete } from "./templetes/smsTemplete";
import { emailTemplate } from "./templetes/emailTemplete";

// Use environment variables for configuration
const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || ['kafka:29092'];

const kafka = new Kafka({
    clientId: 'exchange-notification-worker',
    brokers: kafkaBrokers
});

const consumer = kafka.consumer({
    groupId:"email-worker"
});

const resend = new Resend(process.env.RESEND_API_KEY as string);

// Only initialize Twilio if credentials are provided
let client: any = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-sid' && 
    process.env.TWILIO_AUTH_TOKEN !== 'your-twilio-token') {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
    console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
}

const mailConsumer = async () => {
    try {
        console.log(`Connecting to Kafka brokers: ${kafkaBrokers.join(', ')}`);
        await consumer.connect();
        console.log('Successfully connected to Kafka');

        console.log('Subscribing to email topic...');
        consumer.subscribe({
            topic: "email",
            fromBeginning: true
        });

        console.log('Starting message consumption...');
        await consumer.run({
            eachMessage: async ({ message }) => {
                try{
                    if(!message.value) return;

                const payload = JSON.parse(message.value.toString());
                const { 
                    to, 
                    asset, 
                    amount,
                    quantity,
                    order
                } = payload;

                const { subject, text, html } = emailTemplate(asset, amount, quantity, order);

                await resend.emails.send({
                    from: "noreply@yourdomain.com",
                    to,
                    subject,
                    html,
                    text
                });

                // Send SMS only if Twilio client is configured
                if (client) {
                    const body = smsTemplete(asset, amount, quantity, order);
                    await client.messages.create({
                        body,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to,
                    });
                } else {
                    console.log('SMS not sent - Twilio not configured');
                }
            } catch(e){
                console.error("Error while sending Email and SMS ", e);
            }
        }
    });
    } catch (error) {
        console.error('Error in mailConsumer:', error);
        // Retry connection after 5 seconds
        setTimeout(() => {
            console.log('Retrying Kafka connection...');
            mailConsumer();
        }, 5000);
    }
}

mailConsumer();