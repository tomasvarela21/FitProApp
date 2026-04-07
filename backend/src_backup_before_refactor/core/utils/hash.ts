import bcrypt from "bcrypt";

export const hashPassword = async (value: string) => {
  return bcrypt.hash(value, 10);
};

export const comparePassword = async (
  plainValue: string,
  hashedValue: string
) => {
  return bcrypt.compare(plainValue, hashedValue);
};