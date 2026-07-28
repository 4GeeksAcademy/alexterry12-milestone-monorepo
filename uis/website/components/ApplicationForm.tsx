"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ApplicationFormErrors,
  ApplicationFormValues,
  COMMENTS_MAX,
  getVolumeWarning,
  validateApplicationForm,
  validateComments,
  validateCompanyName,
  validateContactPerson,
  validateCountry,
  validateCurrent3pl,
  validateEmail,
  validatePhone,
  validatePrivacy,
  validateProductType,
  validateServices,
  validateVolume,
  validateWebsite,
} from "@/lib/applicationValidation";

const initialValues: ApplicationFormValues = {
  companyName: "",
  contactPerson: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  productType: "",
  volume: "",
  services: [],
  current3pl: "",
  comments: "",
  privacy: false,
};

const serviceOptions = [
  { id: "service-warehousing", value: "Warehousing", label: "Warehousing" },
  { id: "service-lastmile", value: "Last mile", label: "Last mile" },
  {
    id: "service-reverse",
    value: "Reverse logistics",
    label: "Reverse logistics",
  },
] as const;

const current3plOptions = [
  { id: "3pl-yes", value: "Yes", label: "Yes" },
  { id: "3pl-no", value: "No", label: "No" },
  {
    id: "3pl-evaluating",
    value: "Evaluating options",
    label: "Evaluating options",
  },
] as const;

const inputClassName =
  "w-full rounded-md border border-bordergray px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber";

const selectClassName = `${inputClassName} bg-white`;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

export function ApplicationForm() {
  const [values, setValues] = useState<ApplicationFormValues>(initialValues);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  const volumeWarning = getVolumeWarning(values.volume, values.productType);
  const commentsRemaining = COMMENTS_MAX - values.comments.length;

  useEffect(() => {
    if (submitted) {
      successRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [submitted]);

  function setField<K extends keyof ApplicationFormValues>(
    key: K,
    value: ApplicationFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setError(key: keyof ApplicationFormErrors, message?: string) {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[key] = message;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function handleBlur(
    key: keyof ApplicationFormErrors,
    validate: () => string | undefined,
  ) {
    setError(key, validate());
  }

  function handleInputRevalidate(
    key: keyof ApplicationFormErrors,
    validate: () => string | undefined,
  ) {
    if (errors[key]) {
      setError(key, validate());
    }
  }

  function toggleService(service: string, checked: boolean) {
    const nextServices = checked
      ? [...values.services, service]
      : values.services.filter((item) => item !== service);
    setField("services", nextServices);
    setError("services", validateServices(nextServices));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateApplicationForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true);
    }
  }

  function handleReset() {
    setValues(initialValues);
    setErrors({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <div
        ref={successRef}
        className="mt-8 rounded-lg border border-green-300 bg-green-50 p-6 text-center"
      >
        <h3 className="mb-2 font-display text-xl text-navy">
          Thank you for your interest in TrackFlow!
        </h3>
        <p className="text-slate">
          We have received your request. Our commercial team will review your
          information and contact you within the next 24-48 hours to schedule a
          call and learn about your logistics needs in detail.
        </p>
        <p className="mt-2 text-slate">
          If you have any urgent inquiry, write to us directly at{" "}
          <a
            href="mailto:comercial@trackflow.com"
            className="text-amber underline"
          >
            comercial@trackflow.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onReset={handleReset}
      noValidate
      className="space-y-8 rounded-lg border border-bordergray bg-white p-6 sm:p-10"
    >
      <fieldset className="space-y-6">
        <legend className="mb-4 font-display text-xl text-navy">
          Company &amp; Contact
        </legend>

        <div>
          <label
            htmlFor="company-name"
            className="mb-1 block font-medium text-navy"
          >
            Company name
          </label>
          <input
            type="text"
            id="company-name"
            name="companyName"
            required
            value={values.companyName}
            onChange={(event) => {
              const value = event.target.value;
              setField("companyName", value);
              handleInputRevalidate("companyName", () =>
                validateCompanyName(value),
              );
            }}
            onBlur={() =>
              handleBlur("companyName", () =>
                validateCompanyName(values.companyName),
              )
            }
            className={inputClassName}
          />
          <FieldError message={errors.companyName} />
        </div>

        <div>
          <label
            htmlFor="contact-person"
            className="mb-1 block font-medium text-navy"
          >
            Contact person (first and last name)
          </label>
          <input
            type="text"
            id="contact-person"
            name="contactPerson"
            required
            value={values.contactPerson}
            onChange={(event) => {
              const value = event.target.value;
              setField("contactPerson", value);
              handleInputRevalidate("contactPerson", () =>
                validateContactPerson(value),
              );
            }}
            onBlur={() =>
              handleBlur("contactPerson", () =>
                validateContactPerson(values.contactPerson),
              )
            }
            className={inputClassName}
          />
          <FieldError message={errors.contactPerson} />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block font-medium text-navy">
            Corporate email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={values.email}
            onChange={(event) => {
              const value = event.target.value;
              setField("email", value);
              handleInputRevalidate("email", () => validateEmail(value));
            }}
            onBlur={() =>
              handleBlur("email", () => validateEmail(values.email))
            }
            className={inputClassName}
          />
          <FieldError message={errors.email} />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block font-medium text-navy">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            placeholder="+1 213 555 0147"
            value={values.phone}
            onChange={(event) => {
              const value = event.target.value;
              setField("phone", value);
              handleInputRevalidate("phone", () => validatePhone(value));
            }}
            onBlur={() =>
              handleBlur("phone", () => validatePhone(values.phone))
            }
            className={inputClassName}
          />
          <FieldError message={errors.phone} />
        </div>

        <div>
          <label htmlFor="website" className="mb-1 block font-medium text-navy">
            Company website (optional)
          </label>
          <input
            type="url"
            id="website"
            name="website"
            placeholder="https://"
            value={values.website}
            onChange={(event) => {
              const value = event.target.value;
              setField("website", value);
              handleInputRevalidate("website", () => validateWebsite(value));
            }}
            onBlur={() =>
              handleBlur("website", () => validateWebsite(values.website))
            }
            className={inputClassName}
          />
          <FieldError message={errors.website} />
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mb-4 font-display text-xl text-navy">
          Operations
        </legend>

        <div>
          <label htmlFor="country" className="mb-1 block font-medium text-navy">
            Main operating country
          </label>
          <select
            id="country"
            name="country"
            required
            value={values.country}
            onChange={(event) => {
              const value = event.target.value;
              setField("country", value);
              setError("country", validateCountry(value));
            }}
            className={selectClassName}
          >
            <option value="" disabled>
              Select an option
            </option>
            <option value="United States">United States</option>
            <option value="Spain">Spain</option>
            <option value="Both">Both</option>
            <option value="Other">Other</option>
          </select>
          <FieldError message={errors.country} />
        </div>

        <div>
          <label
            htmlFor="product-type"
            className="mb-1 block font-medium text-navy"
          >
            Product type
          </label>
          <select
            id="product-type"
            name="productType"
            required
            value={values.productType}
            onChange={(event) => {
              const value = event.target.value;
              setField("productType", value);
              setError("productType", validateProductType(value));
            }}
            className={selectClassName}
          >
            <option value="" disabled>
              Select an option
            </option>
            <option value="Fashion">Fashion</option>
            <option value="Electronics">Electronics</option>
            <option value="Cosmetics">Cosmetics</option>
            <option value="Food">Food</option>
            <option value="Other">Other</option>
          </select>
          <FieldError message={errors.productType} />
        </div>

        <div>
          <label htmlFor="volume" className="mb-1 block font-medium text-navy">
            Estimated monthly shipping volume
          </label>
          <select
            id="volume"
            name="volume"
            required
            value={values.volume}
            onChange={(event) => {
              const value = event.target.value;
              setField("volume", value);
              setError("volume", validateVolume(value));
            }}
            className={selectClassName}
          >
            <option value="" disabled>
              Select an option
            </option>
            <option value="0-100">0-100</option>
            <option value="101-500">101-500</option>
            <option value="501-2000">501-2000</option>
            <option value="2000+">2000+</option>
            <option value="Not sure">Not sure</option>
          </select>
          <FieldError message={errors.volume} />
          {volumeWarning ? (
            <p className="mt-2 text-sm font-medium text-amber">{volumeWarning}</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mb-4 font-display text-xl text-navy">
          Interest &amp; Fit
        </legend>

        <div>
          <p className="mb-2 block font-medium text-navy">
            Services of interest
          </p>
          {serviceOptions.map((option) => (
            <label
              key={option.id}
              className="mb-2 flex cursor-pointer items-center gap-2"
            >
              <input
                type="checkbox"
                id={option.id}
                name="services"
                value={option.value}
                checked={values.services.includes(option.value)}
                onChange={(event) =>
                  toggleService(option.value, event.target.checked)
                }
                className="h-4 w-4 accent-amber"
              />
              {option.label}
            </label>
          ))}
          <FieldError message={errors.services} />
        </div>

        <div>
          <p className="mt-6 mb-2 block font-medium text-navy">
            Do you currently work with another 3PL?
          </p>
          {current3plOptions.map((option) => (
            <label
              key={option.id}
              className="mb-2 flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                id={option.id}
                name="current3pl"
                value={option.value}
                checked={values.current3pl === option.value}
                onChange={() => {
                  setField("current3pl", option.value);
                  setError("current3pl", validateCurrent3pl(option.value));
                }}
                className="h-4 w-4 accent-amber"
              />
              {option.label}
            </label>
          ))}
          <FieldError message={errors.current3pl} />
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mb-4 font-display text-xl text-navy">
          Additional Information
        </legend>

        <div>
          <label
            htmlFor="comments"
            className="mb-1 block font-medium text-navy"
          >
            Comments or specific needs (optional)
          </label>
          <textarea
            id="comments"
            name="comments"
            maxLength={COMMENTS_MAX}
            rows={4}
            value={values.comments}
            onChange={(event) => {
              const value = event.target.value;
              setField("comments", value);
              setError("comments", validateComments(value));
            }}
            className={inputClassName}
          />
          <p className="mt-1 text-sm text-slate">
            {commentsRemaining} characters remaining
          </p>
          <FieldError message={errors.comments} />
        </div>

        <div>
          <label className="mt-6 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              id="privacy"
              name="privacy"
              required
              checked={values.privacy}
              onChange={(event) => {
                const checked = event.target.checked;
                setField("privacy", checked);
                setError("privacy", validatePrivacy(checked));
              }}
              className="mt-1 h-4 w-4 accent-amber"
            />
            <span className="text-slate">I accept the privacy policy</span>
          </label>
          <FieldError message={errors.privacy} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 pt-4 sm:flex-row">
        <button
          type="submit"
          className="rounded-lg bg-amber px-8 py-3 font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Submit request
        </button>
        <button
          type="reset"
          className="rounded-lg border border-bordergray px-8 py-3 font-semibold text-navy transition-colors hover:bg-gray-100"
        >
          Clear form
        </button>
      </div>
    </form>
  );
}
