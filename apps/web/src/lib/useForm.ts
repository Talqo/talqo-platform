import { useCallback, useRef, useState } from "react";

type FormErrors<T> = Partial<Record<keyof T | "_form", string>>;
type FormTouched<T> = Partial<Record<keyof T, boolean>>;
type Validator<T> = (values: T) => FormErrors<T>;

interface UseFormOptions<T> {
	initialValues: T;
	validate?: Validator<T>;
	onSubmit: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T> {
	values: T;
	errors: FormErrors<T>;
	touched: FormTouched<T>;
	isSubmitting: boolean;
	handleChange: (field: keyof T) => (value: T[keyof T]) => void;
	handleBlur: (field: keyof T) => () => void;
	handleSubmit: (e: React.FormEvent) => void;
	setFieldError: (field: keyof T, error: string) => void;
	reset: () => void;
}

export function useForm<T extends Record<string, string | number | boolean>>({
	initialValues,
	validate,
	onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
	const [values, setValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<FormErrors<T>>({});
	const [touched, setTouched] = useState<FormTouched<T>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	// Ref to prevent duplicate submissions synchronously
	const isSubmittingRef = useRef(false);

	const handleChange = useCallback(
		(field: keyof T) => (value: T[keyof T]) => {
			setValues((prev) => ({ ...prev, [field]: value }));
			// Clear error when user starts typing
			if (errors[field]) {
				setErrors((prev) => ({ ...prev, [field]: undefined }));
			}
		},
		[errors],
	);

	const handleBlur = useCallback(
		(field: keyof T) => () => {
			setTouched((prev) => ({ ...prev, [field]: true }));
			if (validate) {
				const validationErrors = validate(values);
				const fieldError = validationErrors[field];
				if (fieldError) {
					setErrors((prev) => ({
						...prev,
						[field]: fieldError,
					}));
				}
			}
		},
		[validate, values],
	);

	const hasRealErrors = useCallback(
		(validationErrors: FormErrors<T>): boolean => {
			return Object.values(validationErrors).some(
				(error) => error !== undefined && error !== "",
			);
		},
		[],
	);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			// Prevent duplicate submissions synchronously
			if (isSubmittingRef.current) {
				return;
			}

			// Mark all fields as touched
			const allTouched = Object.fromEntries(
				Object.keys(initialValues).map((key) => [key, true]),
			) as FormTouched<T>;
			setTouched(allTouched);

			// Validate all fields
			if (validate) {
				const validationErrors = validate(values);
				setErrors(validationErrors);

				// Check for actual error values, not just keys
				if (hasRealErrors(validationErrors)) {
					return;
				}
			}

			isSubmittingRef.current = true;
			setIsSubmitting(true);
			try {
				await onSubmit(values);
			} finally {
				isSubmittingRef.current = false;
				setIsSubmitting(false);
			}
		},
		[initialValues, onSubmit, validate, values, hasRealErrors],
	);

	const setFieldError = useCallback((field: keyof T, error: string) => {
		setErrors((prev) => ({ ...prev, [field]: error }));
	}, []);

	const reset = useCallback(() => {
		setValues(initialValues);
		setErrors({});
		setTouched({});
		setIsSubmitting(false);
		isSubmittingRef.current = false;
	}, [initialValues]);

	return {
		values,
		errors,
		touched,
		isSubmitting,
		handleChange,
		handleBlur,
		handleSubmit,
		setFieldError,
		reset,
	};
}

// Common validators
export const validators = {
	email: (email: string): string | undefined => {
		if (!email) return "Email is required";
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return "Please enter a valid email address";
		}
		return undefined;
	},

	password: (password: string, minLength = 6): string | undefined => {
		if (!password) return "Password is required";
		if (password.length < minLength) {
			return `Password must be at least ${minLength} characters`;
		}
		return undefined;
	},

	strongPassword: (password: string): string | undefined => {
		if (!password) return "Password is required";
		if (password.length < 8) return "Password must be at least 8 characters";
		if (!/[A-Z]/.test(password))
			return "Password must contain at least one uppercase letter";
		if (!/[a-z]/.test(password))
			return "Password must contain at least one lowercase letter";
		if (!/[0-9]/.test(password))
			return "Password must contain at least one number";
		if (!/[^A-Za-z0-9]/.test(password))
			return "Password must contain at least one special character";
		return undefined;
	},

	required: (value: string, fieldName = "Field"): string | undefined => {
		if (!value || value.trim() === "") return `${fieldName} is required`;
		return undefined;
	},
};
