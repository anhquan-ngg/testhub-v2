import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { log } from "console";

// Định nghĩa kiểu cho state của user slice
interface UserState {
  id: string;
  full_name: string;
  email: string;
  role: "ADMIN" | "STUDENT" | "TEACHER" | null;
  isLoggedIn: boolean;
}

// Định nghĩa kiểu cho state của user slice
const initialState: UserState = {
  id: "",
  full_name: "",
  email: "",
  role: null,
  isLoggedIn: false,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Định nghĩa kiểu cho payload của action 'login'
    login: (
      state,
      action: PayloadAction<{
        id: "";
        full_name: "";
        email: "";
        role: "ADMIN" | "STUDENT" | "TEACHER";
      }>
    ) => {
      state.id = action.payload.id;
      state.full_name = action.payload.full_name;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.id = "";
      state.full_name = "";
      state.email = "";
      state.role = null;
      state.isLoggedIn = false;
    },
  },
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;
