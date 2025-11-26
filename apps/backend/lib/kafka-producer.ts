import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: 'exchange',
    brokers: ['localhost:9092']
});

const producer = kafka.producer();

const emailService = async (email: string) => {
    await producer.connect();
 
    producer.send({
        topic:"email",
        messages:[
            {
                value: email,
            }
        ]
    });
}

export default emailService;
