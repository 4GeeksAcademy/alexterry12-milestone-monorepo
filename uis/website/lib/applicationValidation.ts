export type ApplicationFormValues = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  productType: string;
  volume: string;
  services: string[];
  current3pl: string;
  comments: string;
  privacy: boolean;
};

export type ApplicationFormErrors = Partial<
  Record<
    | keyof Omit<ApplicationFormValues, "services" | "privacy">
    | "services"
    | "privacy"
    | "comments",
    string
  >
>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+\d{1,3}[\s\d]{6,}$/;

export const COMMENTS_MAX = 500;

export function validateCompanyName(value: string): string | undefined {
  if (value.trim().length < 2) {
    return "Company name must have at least 2 characters";
  }
  return undefined;
}

export function validateContactPerson(value: string): string | undefined {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return "Enter first and last name of contact";
  }
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  if (!EMAIL_REGEX.test(value.trim())) {
    return "Enter a valid corporate email (example: name@company.com)";
  }
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  if (!PHONE_REGEX.test(value.trim())) {
    return "Phone must include country code (example: +1 213 555 0147)";
  }
  return undefined;
}

export function validateWebsite(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  if (!/^https?:\/\//i.test(trimmed)) {
    return "If you include website, it must be a valid URL";
  }
  return undefined;
}

export function validateCountry(value: string): string | undefined {
  if (value === "" || value === "Select an option") {
    return "Select main operating country";
  }
  return undefined;
}

export function validateProductType(value: string): string | undefined {
  if (value === "") {
    return "Select the type of product you handle";
  }
  return undefined;
}

export function validateVolume(value: string): string | undefined {
  if (value === "") {
    return "Select estimated monthly volume";
  }
  return undefined;
}

export function validateServices(services: string[]): string | undefined {
  if (services.length === 0) {
    return "Select at least one service of interest";
  }
  return undefined;
}

export function validateCurrent3pl(value: string): string | undefined {
  if (value === "") {
    return "Indicate if you currently work with another logistics provider";
  }
  return undefined;
}

export function validatePrivacy(checked: boolean): string | undefined {
  if (!checked) {
    return "You must accept the privacy policy to continue";
  }
  return undefined;
}

export function validateComments(value: string): string | undefined {
  if (value.length > COMMENTS_MAX) {
    return "Comments cannot exceed 500 characters (0 remaining)";
  }
  return undefined;
}

export function getVolumeWarning(
  volume: string,
  productType: string,
): string | undefined {
  if (volume === "0-100" && productType !== "") {
    return "For volumes under 100 monthly shipments, our services might not be the most efficient solution. Are you sure you want to continue?";
  }
  return undefined;
}

export function validateApplicationForm(
  values: ApplicationFormValues,
): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};

  const companyName = validateCompanyName(values.companyName);
  if (companyName) errors.companyName = companyName;

  const contactPerson = validateContactPerson(values.contactPerson);
  if (contactPerson) errors.contactPerson = contactPerson;

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  const phone = validatePhone(values.phone);
  if (phone) errors.phone = phone;

  const website = validateWebsite(values.website);
  if (website) errors.website = website;

  const country = validateCountry(values.country);
  if (country) errors.country = country;

  const productType = validateProductType(values.productType);
  if (productType) errors.productType = productType;

  const volume = validateVolume(values.volume);
  if (volume) errors.volume = volume;

  const services = validateServices(values.services);
  if (services) errors.services = services;

  const current3pl = validateCurrent3pl(values.current3pl);
  if (current3pl) errors.current3pl = current3pl;

  const privacy = validatePrivacy(values.privacy);
  if (privacy) errors.privacy = privacy;

  const comments = validateComments(values.comments);
  if (comments) errors.comments = comments;

  return errors;
}
