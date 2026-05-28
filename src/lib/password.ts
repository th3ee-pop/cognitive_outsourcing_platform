import bcrypt from "bcryptjs";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function validatePassword(value: string) {
  if (!PASSWORD_PATTERN.test(value)) {
    return "新密码需同时包含字母和数字，长度不少于 8 位。";
  }
  return null;
}

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 10);
}

export async function comparePassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}
