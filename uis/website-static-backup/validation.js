console.log("validation.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("application-form");
  const successMessage = document.getElementById("success-message");

  const companyNameInput = document.getElementById("company-name");
  const contactPersonInput = document.getElementById("contact-person");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const websiteInput = document.getElementById("website");
  const countryInput = document.getElementById("country");
  const productTypeInput = document.getElementById("product-type");
  const volumeInput = document.getElementById("volume");
  const commentsInput = document.getElementById("comments");
  const commentsCounter = document.getElementById("comments-counter");
  const privacyInput = document.getElementById("privacy");
  const volumeWarning = document.getElementById("volume-warning");

  function showError(errorId, message) {
    const errorEl = document.getElementById(errorId);
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  function clearError(errorId) {
    const errorEl = document.getElementById(errorId);
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  function isErrorVisible(errorId) {
    const errorEl = document.getElementById(errorId);
    return errorEl && !errorEl.classList.contains("hidden");
  }

  function validateCompanyName() {
    const value = companyNameInput.value.trim();
    if (value.length < 2) {
      showError("companyName-error", "Company name must have at least 2 characters");
      return false;
    }
    clearError("companyName-error");
    return true;
  }

  function validateContactPerson() {
    const value = contactPersonInput.value.trim();
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      showError("contactPerson-error", "Enter first and last name of contact");
      return false;
    }
    clearError("contactPerson-error");
    return true;
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showError("email-error", "Enter a valid corporate email (example: name@company.com)");
      return false;
    }
    clearError("email-error");
    return true;
  }

  function validatePhone() {
    const value = phoneInput.value.trim();
    const phoneRegex = /^\+\d{1,3}[\s\d]{6,}$/;
    if (!phoneRegex.test(value)) {
      showError("phone-error", "Phone must include country code (example: +1 213 555 0147)");
      return false;
    }
    clearError("phone-error");
    return true;
  }

  function validateWebsite() {
    const value = websiteInput.value.trim();
    if (value === "") {
      clearError("website-error");
      return true;
    }
    if (!/^https?:\/\//i.test(value)) {
      showError("website-error", "If you include website, it must be a valid URL");
      return false;
    }
    clearError("website-error");
    return true;
  }

  function validateCountry() {
    const value = countryInput.value;
    if (value === "" || value === "Select an option") {
      showError("country-error", "Select main operating country");
      return false;
    }
    clearError("country-error");
    return true;
  }

  function validateProductType() {
    const value = productTypeInput.value;
    if (value === "") {
      showError("productType-error", "Select the type of product you handle");
      return false;
    }
    clearError("productType-error");
    return true;
  }

  function validateVolume() {
    const value = volumeInput.value;
    if (value === "") {
      showError("volume-error", "Select estimated monthly volume");
      return false;
    }
    clearError("volume-error");
    return true;
  }

  function validateServices() {
    const checked = document.querySelectorAll('input[name="services"]:checked').length > 0;
    if (!checked) {
      showError("services-error", "Select at least one service of interest");
      return false;
    }
    clearError("services-error");
    return true;
  }

  function validateCurrent3pl() {
    const checked = document.querySelectorAll('input[name="current3pl"]:checked').length > 0;
    if (!checked) {
      showError("current3pl-error", "Indicate if you currently work with another logistics provider");
      return false;
    }
    clearError("current3pl-error");
    return true;
  }

  function validatePrivacy() {
    if (!privacyInput.checked) {
      showError("privacy-error", "You must accept the privacy policy to continue");
      return false;
    }
    clearError("privacy-error");
    return true;
  }

  function updateCommentsCounter() {
    const remaining = 500 - commentsInput.value.length;
    commentsCounter.textContent = remaining + " characters remaining";
    if (remaining < 0) {
      showError("comments-error", "Comments cannot exceed 500 characters (0 remaining)");
    } else {
      clearError("comments-error");
    }
  }

  function updateVolumeWarning() {
    if (volumeInput.value === "0-100" && productTypeInput.value !== "") {
      volumeWarning.textContent = "For volumes under 100 monthly shipments, our services might not be the most efficient solution. Are you sure you want to continue?";
      volumeWarning.classList.remove("hidden");
    } else {
      volumeWarning.textContent = "";
      volumeWarning.classList.add("hidden");
    }
  }

  function validateForm() {
    const validators = [
      validateCompanyName,
      validateContactPerson,
      validateEmail,
      validatePhone,
      validateWebsite,
      validateCountry,
      validateProductType,
      validateVolume,
      validateServices,
      validateCurrent3pl,
      validatePrivacy
    ];
    let isValid = true;
    validators.forEach(function (validate) {
      if (!validate()) {
        isValid = false;
      }
    });
    return isValid;
  }

  const fieldValidators = [
    { input: companyNameInput, errorId: "companyName-error", validate: validateCompanyName },
    { input: contactPersonInput, errorId: "contactPerson-error", validate: validateContactPerson },
    { input: emailInput, errorId: "email-error", validate: validateEmail },
    { input: phoneInput, errorId: "phone-error", validate: validatePhone },
    { input: websiteInput, errorId: "website-error", validate: validateWebsite }
  ];

  fieldValidators.forEach(function (field) {
    field.input.addEventListener("blur", field.validate);
    field.input.addEventListener("input", function () {
      if (isErrorVisible(field.errorId)) {
        field.validate();
      }
    });
  });

  countryInput.addEventListener("change", validateCountry);
  productTypeInput.addEventListener("change", validateProductType);
  volumeInput.addEventListener("change", validateVolume);
  volumeInput.addEventListener("change", updateVolumeWarning);

  document.querySelectorAll('input[name="services"]').forEach(function (checkbox) {
    checkbox.addEventListener("change", validateServices);
  });

  document.querySelectorAll('input[name="current3pl"]').forEach(function (radio) {
    radio.addEventListener("change", validateCurrent3pl);
  });

  privacyInput.addEventListener("change", validatePrivacy);

  commentsInput.addEventListener("input", updateCommentsCounter);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (validateForm()) {
      form.classList.add("hidden");
      successMessage.classList.remove("hidden");
      successMessage.scrollIntoView({ behavior: "smooth" });
    }
  });
});
