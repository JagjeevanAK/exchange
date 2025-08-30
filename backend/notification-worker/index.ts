import { Kafka } from "kafkajs";
import { Resend } from "resend";
import twilio from "twilio";
import { smsTemplete } from "./templetes/smsTemplete";
import { emailTemplate } from "./templetes/emailTemplete";

const kafka = new Kafka({
    clientId: 'exchange',
    brokers: ['localhost:9092']
});

const consumer = kafka.consumer({
    groupId:"email-worker"
});

const resend = new Resend(process.env.RESEND_API_KEY as string);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const mailConsumer = async () => {
    await consumer.connect();

    consumer.subscribe({
        topic: "email",
        fromBeginning: true
    });

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

                const body = smsTemplete(asset, amount, quantity, order);
                await client.messages.create({
                    body,
                    from: process.env.TWILIO_PHONE,
                    to,
                });
            } catch(e){
                console.error("Error while sending Email and SMS ", e);
            }
        }
    }
    )
}

mailConsumer();