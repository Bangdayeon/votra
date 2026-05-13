export type UserRow = {
  id: string;
  email: string;
  name: string | null;
};

export type UserRepository = {
  findByEmail: (email: string) => Promise<UserRow | null>;
  create: (data: { email: string; name?: string | null }) => Promise<UserRow>;
};
