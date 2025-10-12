declare module "next-auth" {
  /**
   * Mở rộng đối tượng Session để chứa thêm thuộc tính `role`.
   */
  interface Session {
    user: {
      id: string;
      role: string; // Thêm role vào đây
    } & DefaultSession["user"];
  }

  /**
   * Mở rộng đối tượng User để chứa `role`.
   */
  interface User extends DefaultUser {
    role: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * Mở rộng đối tượng JWT để chứa `role`.
   */
  interface JWT extends DefaultJWT {
    role: string;
  }
}
