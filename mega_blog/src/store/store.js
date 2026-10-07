import { configureStore, createStore } from "@reduxjs/toolkit";
import authSllice from "./authSlice"

const store = configureStore({
    reducer: {
        auth: authSllice,
        
        //TODO: add more slices here for posts
    }
});


export default store;