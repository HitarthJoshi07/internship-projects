import conf from "../conf/conf.js";
import { Client, Account, ID } from "appwrite";

export class AuthService {
    client = new Client();
    account ;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteUrl)
            .setProject(conf.appwriteProjectId);

        this.account = new Account(this.client)
    }

    async createAccount({email, password, name}) {
        try {
            const userAcoount = await this.account.create(ID.unique(), email, password, name)
            if (userAcoount) {
                //another meethhid to call
                return this.login({email, password})
            } else {
                return userAcoount;
            }
        } catch (error) {
            throw error;
        }
    }

    async login({email, password}){
        try {
            return await this.account.createEmailPasswordSession(email, password)
        } catch (error) {
            throw error;
        }
    }

    async getCurrentUser(){
        try {
          return await this.account.get()  
        } catch (error) {
            console.log("APPWRITE ERR :: GetCurrentUser :: ERROR", error)
        }

        return null;
    }

    async logout(){
        try {
            await this.account.deleteSessions()
        } catch (error) {
            console.log("APPWRITE Service :: LogOut :: ERROR", error)
        }
    }
}

const authService = new AuthService();

export default authService;