
class PubSubManager {
    private static instance: PubSubManager;

    private constructor(){

    }

    private static getInstance(): PubSubManager {
        if (!this.instance){
            this.instance = new PubSubManager();
        }
        return this.instance;
    }
}