import {
  useDispatch,
  useSelector,
  useStore,
  type TypedUseSelectorHook,
} from "react-redux";
import type { AppDispatch, AppStore, RootState } from "./index";

// Typed hooks for use across the app. This pattern is compatible with react-redux
// and avoids relying on non-standard runtime helpers.
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = () => useStore<AppStore>();

// Selector helpers cho user state
export const selectUser = (state: RootState) => state.user;
export const selectIsLoggedIn = (state: RootState) => state.user.isLoggedIn;
export const selectUserRole = (state: RootState) => state.user.role;
export const selectUserInfo = (state: RootState) => ({
  id: state.user.id,
  full_name: state.user.full_name,
  email: state.user.email,
  role: state.user.role,
});

// Custom hooks để dễ dàng truy cập user state
export const useUser = () => useAppSelector(selectUser);
export const useIsLoggedIn = () => useAppSelector(selectIsLoggedIn);
export const useUserRole = () => useAppSelector(selectUserRole);
export const useUserInfo = () => useAppSelector(selectUserInfo);

// Selector helpers cho exam state
export const selectExam = (state: RootState) => state.exam;
export const selectTestStarted = (state: RootState) => state.exam.testStarted;

// Custom hooks để dễ dàng truy cập exam state
export const useExam = () => useAppSelector(selectExam);
export const useTestStarted = () => useAppSelector(selectTestStarted);
