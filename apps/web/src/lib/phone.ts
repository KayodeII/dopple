/** "+2348031234567" as Nigerians write it, "0803 123 4567"; other countries as stored. */
export function formatPhone(e164: string): string {
  const local = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return local ? `0${local[1]} ${local[2]} ${local[3]}` : e164;
}
