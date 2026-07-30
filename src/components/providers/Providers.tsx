"use client";

import UserLoader from "@/components/UserLoader";
import SocketProvider from "@/components/providers/SocketProvider";
import { store } from "@/store";
import { Provider } from "react-redux";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <UserLoader>
        <SocketProvider>{children}</SocketProvider>
      </UserLoader>
    </Provider>
  );
}
