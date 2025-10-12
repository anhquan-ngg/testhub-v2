// // store/index.ts
// "use client";

// import { configureStore } from "@reduxjs/toolkit";
// import { Provider, useDispatch, useSelector } from "react-redux";
// import userReducer from "./userSlice";

// export const store = configureStore({
//   reducer: {
//     user: userReducer,
//   },
// });

// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
// export const useAppDispatch = () => useDispatch<AppDispatch>();
// export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);

// export function ReduxProvider({ children }: { children: React.ReactNode }) {
//   return <Provider store={store}>{children}</Provider>;
// }
