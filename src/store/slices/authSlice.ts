import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  id: string;
  full_name: string;
  email: string;
  school: string;
  phone: string;
  address: string;
  avatar_url: string | null;
  role: "ADMIN" | "STUDENT" | "LECTURER" | null;
  isLoggedIn: boolean;
}

// Định nghĩa kiểu cho state ban đầu của user slice
const initialState: AuthState = {
  id: "",
  full_name: "",
  email: "",
  school: "",
  phone: "",
  address: "",
  avatar_url: null,
  role: null,
  isLoggedIn: false,
};

type AuthPayload =
  | Partial<{
      id: string;
      full_name: string;
      fullName: string;
      email: string;
      school: string;
      phone: string;
      address: string;
      avatar_url: string | null;
      avatar: string | null;
      role: "ADMIN" | "STUDENT" | "LECTURER";
    }>
  | null;

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthPayload>) {
      if (!action.payload) {
        state.id = "";
        state.full_name = "";
        state.email = "";
        state.school = "";
        state.phone = "";
        state.address = "";
        state.avatar_url = null;
        state.role = null;
        state.isLoggedIn = false;
        return;
      }

      state.id = action.payload.id ?? "";
      state.full_name =
        action.payload.full_name ?? action.payload.fullName ?? state.full_name;
      state.email = action.payload.email ?? state.email;
      state.school = action.payload.school ?? state.school;
      state.phone = action.payload.phone ?? state.phone;
      state.address = action.payload.address ?? state.address;
      state.avatar_url = action.payload.avatar_url ?? action.payload.avatar ?? state.avatar_url;
      state.role = action.payload.role ?? null;
      state.isLoggedIn = true;
    },
    clearAuth(state) {
      state.id = "";
      state.full_name = "";
      state.email = "";
      state.school = "";
      state.phone = "";
      state.address = "";
      state.avatar_url = null;
      state.role = null;
      state.isLoggedIn = false;
    },
  },  
});

export const { setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
