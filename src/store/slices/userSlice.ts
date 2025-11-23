import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Định nghĩa kiểu cho state của user slice
export interface UserState {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: "ADMIN" | "STUDENT" | "LECTURER" | null;
  isLoggedIn: boolean;
}

// Định nghĩa kiểu cho state ban đầu của user slice
const initialState: UserState = {
  id: "",
  full_name: "",
  email: "",
  avatar_url: null,
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
        id: string;
        full_name: string;
        avatar_url: string | null;
        email: string;
        role: "ADMIN" | "STUDENT" | "LECTURER";
      }>
    ) => {
      state.id = action.payload.id;
      state.full_name = action.payload.full_name;
      state.email = action.payload.email;
      state.avatar_url = action.payload.avatar_url;
      state.role = action.payload.role;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.id = "";
      state.full_name = "";
      state.email = "";
      state.avatar_url = "";
      state.role = null;
      state.isLoggedIn = false;
    },
  },
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;
