import { CATEGORY_SINGULAR, type Category, type Field, type VaultItem, makeId, now } from "./model";

export type CategoryMeta = {
  id: Category;
  title: string;
  singular: string;
  color: string;
  icon: string;
  common: boolean;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "login", title: "Logins", singular: "Login", color: "#0572EC", icon: "person-circle", common: true },
  { id: "secureNote", title: "Secure Notes", singular: "Secure Note", color: "#FFCC00", icon: "document-text", common: true },
  { id: "creditCard", title: "Credit Cards", singular: "Credit Card", color: "#34C759", icon: "card", common: true },
  { id: "identity", title: "Identities", singular: "Identity", color: "#AF52DE", icon: "id-card", common: true },
  { id: "password", title: "Passwords", singular: "Password", color: "#5AC8FA", icon: "key", common: true },
  { id: "document", title: "Documents", singular: "Document", color: "#8E8E93", icon: "folder", common: true },
  { id: "apiCredential", title: "API Credentials", singular: "API Credential", color: "#FF2D55", icon: "code-slash", common: false },
  { id: "bankAccount", title: "Bank Accounts", singular: "Bank Account", color: "#30B0C7", icon: "cash", common: false },
  { id: "cryptoWallet", title: "Crypto Wallets", singular: "Crypto Wallet", color: "#FF9500", icon: "wallet", common: false },
  { id: "database", title: "Databases", singular: "Database", color: "#5856D6", icon: "server", common: false },
  { id: "driverLicense", title: "Driver Licenses", singular: "Driver License", color: "#007AFF", icon: "car", common: false },
  { id: "emailAccount", title: "Email Accounts", singular: "Email Account", color: "#FF3B30", icon: "mail", common: false },
  { id: "medicalRecord", title: "Medical Records", singular: "Medical Record", color: "#FF2D55", icon: "medkit", common: false },
  { id: "membership", title: "Memberships", singular: "Membership", color: "#AF52DE", icon: "ribbon", common: false },
  { id: "outdoorLicense", title: "Outdoor Licenses", singular: "Outdoor License", color: "#34C759", icon: "leaf", common: false },
  { id: "passport", title: "Passports", singular: "Passport", color: "#007AFF", icon: "airplane", common: false },
  { id: "rewardProgram", title: "Reward Programs", singular: "Reward Program", color: "#FF9500", icon: "star", common: false },
  { id: "sshKey", title: "SSH Keys", singular: "SSH Key", color: "#1C1C1E", icon: "terminal", common: false },
  { id: "server", title: "Servers", singular: "Server", color: "#8E8E93", icon: "desktop", common: false },
  { id: "ssn", title: "Social Security Numbers", singular: "Social Security Number", color: "#FF3B30", icon: "shield", common: false },
  { id: "softwareLicense", title: "Software Licenses", singular: "Software License", color: "#5856D6", icon: "pricetag", common: false },
  { id: "wirelessRouter", title: "Wireless Routers", singular: "Wireless Router", color: "#5AC8FA", icon: "wifi", common: false },
];

export const CATEGORY_BY_ID: Record<Category, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<Category, CategoryMeta>;

function f(id: string, label: string, kind: Field["kind"], section?: string): Field {
  return { id, label, value: "", kind, section };
}

export function fieldsFor(category: Category): Field[] {
  switch (category) {
    case "login":
      return [f("username", "username", "text"), f("password", "password", "password"), f("totp", "one-time password", "totp")];
    case "secureNote":
      return [];
    case "creditCard":
      return [
        f("cardholder", "cardholder name", "text"),
        f("type", "type", "menu"),
        f("number", "number", "concealed"),
        f("cvv", "verification number", "concealed"),
        f("expiry", "expiry date", "monthYear"),
        f("validFrom", "valid from", "monthYear"),
        f("pin", "PIN", "concealed"),
        f("creditLimit", "credit limit", "text"),
      ];
    case "identity":
      return [
        f("firstName", "first name", "text", "Identification"),
        f("lastName", "last name", "text", "Identification"),
        f("sex", "sex", "text", "Identification"),
        f("birthDate", "birth date", "date", "Identification"),
        f("occupation", "occupation", "text", "Address"),
        f("company", "company", "text", "Address"),
        f("department", "department", "text", "Address"),
        f("jobTitle", "job title", "text", "Address"),
        f("address", "address", "textarea", "Address"),
        f("phone", "default phone", "phone", "Address"),
        f("email", "email", "email", "Address"),
        f("username", "username", "text", "Internet"),
      ];
    case "password":
      return [f("password", "password", "password"), f("username", "username", "text")];
    case "document":
      return [f("fileName", "file name", "text")];
    case "apiCredential":
      return [
        f("username", "username", "text"),
        f("credential", "credential", "concealed"),
        f("hostname", "hostname", "text"),
        f("type", "type", "text"),
        f("filename", "filename", "text"),
      ];
    case "bankAccount":
      return [
        f("bankName", "bank name", "text"),
        f("nameOnAccount", "name on account", "text"),
        f("type", "type", "text"),
        f("routingNumber", "routing number", "text"),
        f("accountNumber", "account number", "concealed"),
        f("swift", "SWIFT", "text"),
        f("iban", "IBAN", "text"),
        f("pin", "PIN", "concealed"),
        f("branchPhone", "phone", "phone"),
        f("branchAddress", "address", "textarea"),
      ];
    case "cryptoWallet":
      return [
        f("walletType", "wallet type", "text"),
        f("address", "address", "text"),
        f("password", "password", "password"),
        f("recoveryPhrase", "recovery phrase", "concealed"),
      ];
    case "database":
      return [
        f("type", "type", "text"),
        f("hostname", "server", "text"),
        f("port", "port", "number"),
        f("database", "database", "text"),
        f("username", "username", "text"),
        f("password", "password", "password"),
        f("sid", "SID", "text"),
        f("alias", "alias", "text"),
      ];
    case "driverLicense":
      return [
        f("fullName", "full name", "text"),
        f("number", "number", "text"),
        f("class", "class", "text"),
        f("state", "state / province", "text"),
        f("country", "country", "text"),
        f("expiry", "expiry date", "date"),
        f("dateOfBirth", "date of birth", "date"),
        f("conditions", "conditions", "text"),
      ];
    case "emailAccount":
      return [
        f("type", "type", "text"),
        f("username", "username", "email"),
        f("password", "password", "password"),
        f("hostname", "server", "text"),
        f("port", "port number", "number"),
        f("security", "security", "text"),
        f("auth", "authentication", "text"),
        f("smtpServer", "SMTP server", "text"),
      ];
    case "medicalRecord":
      return [
        f("date", "date", "date"),
        f("location", "location", "text"),
        f("healthcareProfessional", "healthcare professional", "text"),
        f("reason", "reason for visit", "textarea"),
        f("medication", "medication", "text"),
        f("notes", "notes", "textarea"),
      ];
    case "membership":
      return [
        f("group", "group", "text"),
        f("website", "website", "url"),
        f("phone", "telephone", "phone"),
        f("memberName", "member name", "text"),
        f("memberId", "member ID", "text"),
        f("pin", "PIN", "concealed"),
        f("expiry", "expiry date", "date"),
      ];
    case "outdoorLicense":
      return [
        f("name", "full name", "text"),
        f("state", "state", "text"),
        f("country", "country", "text"),
        f("expires", "expires", "date"),
        f("approvedWildlife", "approved wildlife", "text"),
        f("quota", "maximum quota", "text"),
      ];
    case "passport":
      return [
        f("type", "type", "text"),
        f("issuingCountry", "issuing country", "text"),
        f("number", "number", "text"),
        f("fullName", "full name", "text"),
        f("gender", "gender", "text"),
        f("nationality", "nationality", "text"),
        f("issuingAuthority", "issuing authority", "text"),
        f("dateOfBirth", "date of birth", "date"),
        f("expiry", "expiry date", "date"),
      ];
    case "rewardProgram":
      return [
        f("company", "company name", "text"),
        f("memberName", "member name", "text"),
        f("memberId", "member ID", "text"),
        f("pin", "PIN", "concealed"),
      ];
    case "sshKey":
      return [f("keyType", "type", "text"), f("privateKey", "private key", "concealed"), f("publicKey", "public key", "textarea"), f("passphrase", "passphrase", "password")];
    case "server":
      return [
        f("url", "URL", "url"),
        f("username", "username", "text"),
        f("password", "password", "password"),
        f("hostname", "hostname", "text"),
      ];
    case "ssn":
      return [f("name", "name", "text"), f("number", "number", "concealed")];
    case "softwareLicense":
      return [
        f("version", "version", "text"),
        f("licenseKey", "license key", "concealed"),
        f("registeredEmail", "licensed to", "email"),
        f("downloadPage", "download page", "url"),
        f("publisher", "publisher", "text"),
        f("supportEmail", "support email", "email"),
        f("purchaseDate", "purchase date", "date"),
        f("orderNumber", "order number", "text"),
      ];
    case "wirelessRouter":
      return [
        f("baseStationName", "base station name", "text"),
        f("baseStationPassword", "base station password", "password"),
        f("networkName", "network name", "text"),
        f("networkPassword", "wireless network password", "password"),
        f("server", "server / IP address", "text"),
        f("airportId", "AirPort ID", "text"),
      ];
  }
}

export function newItem(category: Category, vaultId: string): VaultItem {
  const createdAt = now();
  const urls = category === "login" || category === "password" || category === "membership" || category === "server"
    ? [{ id: makeId(), label: "website", href: "" }]
    : [];
  return {
    id: makeId(),
    vaultId,
    category,
    title: "",
    notes: "",
    tags: [],
    favorite: false,
    archived: false,
    trashed: false,
    createdAt,
    updatedAt: createdAt,
    useCount: 0,
    fields: fieldsFor(category),
    urls,
    iconColor: CATEGORY_BY_ID[category].color,
  };
}

export function categoryMeta(category: Category): CategoryMeta {
  return CATEGORY_BY_ID[category];
}

export function categoryLabel(category: Category): string {
  return CATEGORY_SINGULAR[category];
}

export const TWO_FACTOR_SITES = [
  "google.com",
  "accounts.google.com",
  "github.com",
  "gitlab.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "amazon.com",
  "apple.com",
  "icloud.com",
  "microsoft.com",
  "live.com",
  "outlook.com",
  "discord.com",
  "slack.com",
  "dropbox.com",
  "instagram.com",
  "linkedin.com",
  "reddit.com",
  "cloudflare.com",
  "digitalocean.com",
  "bitbucket.org",
  "npmjs.com",
  "figma.com",
  "notion.so",
  "zoom.us",
];
