export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("th-TH").format(n);
}

// th-TH-u-ca-gregory forces Gregorian (CE) year instead of Buddhist Era (BE/พ.ศ.)
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
