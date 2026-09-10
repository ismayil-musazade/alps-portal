import crypto from "crypto";

/**
 * The five walk-in exam desks.
 *
 * A seat is furniture, not a person. Five candidates a week sign in with the
 * same login, so a seat owns nothing: the name, the answers and the score all
 * live on the sitting, and the seat is only how a browser reaches the exam
 * screen. That separation is why "Exam Account 3" never ends up holding two
 * different people's results.
 */
export const SEAT_COUNT = 5;

export const SEAT_NUMBERS = Array.from({ length: SEAT_COUNT }, (_, i) => i + 1);

/** What the front desk types into "Email or phone". */
export function seatLogin(seatNo: number) {
  return `exam${seatNo}`;
}

export function seatName(seatNo: number) {
  return `Exam desk ${seatNo}`;
}

/**
 * A password someone reads off a screen and types on another machine, so the
 * alphabet leaves out characters that get confused by eye: O/0, I/1/l, S/5.
 */
const ALPHABET = "ABCDEFGHJKMNPQRTUVWXYZ2346789";

export function seatPassword() {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}
