
"use client";
import React, { useState, useEffect } from "react";
import {
  TextField,
  AutoComplete,
  Button,
  DotProgress,
  Switch,
  Select,
  RangeSlider,
  NumberStepper,
} from "@kai/ui";
import type { ButtonVariant, Option } from "@kai/ui";
import LocationPickerWrapper from "../LocationPicker/LocationPickerWrapper";
import MultimediaUpdater from "../FileUploader/MultimediaUpdater";

export interface BaseUpdateFormFieldGroup {
	id?: string;
	title?: string;
	subtitle?: string;
	columns?: number;
	gap?: number;
	fields: BaseUpdateFormField[];
}

type UpdateBaseFormFields = BaseUpdateFormField[] | BaseUpdateFormFieldGroup[];

type FormValues = Record<string, unknown>;

const isLatLng = (value: unknown): value is { lat: number; lng: number } => {
	return (
		typeof value === "object" &&
		value !== null &&
		"lat" in value &&
		"lng" in value &&
		typeof (value as { lat: unknown }).lat === "number" &&
		typeof (value as { lng: unknown }).lng === "number"
	);
};

const isRangeTuple = (value: unknown): value is [number, number] => {
	return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number");
};

const getSelectableValue = (value: unknown): string | number | null => {
	return typeof value === "string" || typeof value === "number" ? value : null;
};

const getStringValue = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return "";
};

const getMediaUrl = (value: unknown): string | undefined => {
	return typeof value === "string" ? value : undefined;
};

export interface BaseUpdateFormField {
	name: string;
	label: string;
	type:
		| "text"
		| "textarea"
		| "autocomplete"
		| "number"
		| "numberStepper"
		| "email"
		| "password"
		| "date"
		| "switch"
		| "select"
		| "range"
		| "location"
		| "dni"
		| "currency"
		| "image"
		| "video"
		| "avatar";
	required?: boolean;
	options?: Option[];
	multiline?: boolean;
	rows?: number;
	disabled?: boolean;
	formatFn?: (input: string) => string;
	startSymbol?: string;
	endSymbol?: string;
	min?: number;
	max?: number;
	step?: number; // step used by numberStepper
	// Props para campos multimedia
	currentUrl?: string;
	currentType?: 'image' | 'video';
	acceptedTypes?: string[];
	maxSize?: number;
	aspectRatio?: '1:1' | '16:9' | '9:16';
	buttonText?: string;
	labelText?: string;
	previewSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	currencySymbol?: string;
	allowDecimalComma?: boolean;
}

export interface UpdateBaseFormProps {
	fields: UpdateBaseFormFields;
	initialState: FormValues;
	onSubmit: (values: FormValues) => void;
	onChange?: (field: string, value: any) => void;
	isSubmitting?: boolean;
	errors?: string[];
	title?: string;
	subtitle?: string;
	submitLabel?: string;
	submitVariant?: ButtonVariant;
	["data-test-id"]?: string;
	columns?: number;
	cancelButton?: boolean;
	cancelButtonText?: string;
	onCancel?: () => void;
}


const isFieldGroupArray = (items: UpdateBaseFormFields): items is BaseUpdateFormFieldGroup[] => {
	return Array.isArray(items) && items.length > 0 && Boolean((items[0] as BaseUpdateFormFieldGroup).fields);
};

const UpdateBaseForm: React.FC<UpdateBaseFormProps> = ({
	fields,
	initialState,
	onSubmit,
	onChange,
	isSubmitting = false,
	errors = [],
	title = "",
	subtitle,
	submitLabel,
	submitVariant = "primary",
	columns = 1,
	cancelButton = false,
	cancelButtonText = "Cerrar",
	onCancel,
	...props
}) => {
	const dataTestId = props["data-test-id"];
	const [values, setValues] = useState<FormValues>(initialState);

	useEffect(() => {
		setValues(initialState);
	}, [initialState]);

	const handleChange = (field: string, value: unknown) => {
		setValues((prev) => ({ ...prev, [field]: value }));
		if (onChange) {
			onChange(field, value);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit(values);
	};

	// Renderizar campo individual
	const renderField = (field: BaseUpdateFormField) => {
		const fieldValue = values[field.name];

		if (field.type === "location") {
			const coordinates = isLatLng(fieldValue) ? fieldValue : { lat: 0, lng: 0 };
			return (
				<LocationPickerWrapper
					mode="update"
					externalPosition={coordinates}
					onChange={(coords: { lat: number; lng: number } | null) => handleChange(field.name, coords ?? coordinates)}
				/>
			);
		}

		if (field.type === "range") {
			const rangeValue = isRangeTuple(fieldValue) ? fieldValue : undefined;
			return (
				<RangeSlider
					min={field.min ?? 0}
					max={field.max ?? 100}
					value={rangeValue}
					onChange={val => handleChange(field.name, val)}
				/>
			);
		}

		if (field.type === "numberStepper") {
			const numberValue = typeof fieldValue === 'number' ? fieldValue : (field.min ?? 0);
			return (
				<NumberStepper
					label={field.label}
					value={numberValue}
					onChange={(val: number) => handleChange(field.name, val)}
					min={field.min}
					max={field.max}
					step={field.step ?? 1}
					required={field.required}
					data-test-id={`${field.name}-number-stepper`}
				/>
			);
		}

		if (field.type === "select") {
			const selectValue = getSelectableValue(fieldValue);
			return (
				<Select
					options={field.options || []}
					placeholder={field.label}
					value={selectValue}
					onChange={(id: string | number | null) => handleChange(field.name, id)}
				/>
			);
		}

		if (field.type === "autocomplete") {
			const selectedId = getSelectableValue(fieldValue) ?? undefined;
			return (
				<AutoComplete
					options={field.options || []}
					label={field.label}
					value={field.options?.find(opt => opt.id === selectedId) || null}
					onChange={opt => handleChange(field.name, opt?.id ?? null)}
					required={field.required}
					name={field.name}
				/>
			);
		}

		if (field.type === "switch") {
			return (
				<Switch
					checked={Boolean(fieldValue)}
					onChange={val => handleChange(field.name, val)}
					label={field.label}
				/>
			);
		}

		if (field.type === "image" || field.type === "video" || field.type === "avatar") {
			return (
				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						{field.label}
					</label>
					<MultimediaUpdater
						currentUrl={field.currentUrl ?? getMediaUrl(fieldValue)}
						currentType={field.currentType || (field.type === 'video' ? 'video' : 'image')}
						variant={field.type === 'avatar' ? 'avatar' : 'default'}
						acceptedTypes={field.acceptedTypes || (field.type === 'video' ? ['video/*'] : ['image/*'])}
						maxSize={field.maxSize || (field.type === 'avatar' ? 2 : 5)}
						aspectRatio={field.aspectRatio || (field.type === 'avatar' ? '1:1' : '16:9')}
						buttonText={field.buttonText || (field.type === 'avatar' ? 'Cambiar avatar' : field.type === 'video' ? 'Actualizar video' : 'Actualizar imagen')}
						labelText={field.labelText ?? field.label}
						previewSize={field.previewSize || 'md'}
						onFileChange={(file) => {
							handleChange(`${field.name}File`, file ?? null);
							if (file) {
								const previewUrl = URL.createObjectURL(file);
								handleChange(field.name, previewUrl);
							} else {
								handleChange(field.name, field.currentUrl ?? null);
							}
						}}
					/>
				</div>
			);
		}

		return (
			<TextField
				label={field.label}
				value={field.formatFn ? field.formatFn(getStringValue(fieldValue)) : getStringValue(fieldValue)}
				onChange={e => handleChange(field.name, field.formatFn ? field.formatFn(e.target.value) : e.target.value)}
				type={field.type}
				name={field.name}
				rows={field.multiline ? field.rows : undefined}
				startSymbol={field.startSymbol}
				endSymbol={field.endSymbol}
				required={field.required}
				disabled={field.disabled}
				currencySymbol={field.currencySymbol}
				allowDecimalComma={field.allowDecimalComma}
				data-test-id={`input-${field.name}`}
			/>
		);
	};

	const resolvedGroups = React.useMemo(() => {
		if (isFieldGroupArray(fields)) {
			return fields.map((group, index) => ({
				id: group.id ?? `group-${index}`,
				title: group.title,
				subtitle: group.subtitle,
				columns: Math.max(1, group.columns ?? columns ?? 1),
				gap: group.gap ?? 4,
				fields: group.fields,
			}));
		}

		return [{
			id: "group-default",
			title: undefined,
			subtitle: undefined,
			columns: Math.max(1, columns ?? 1),
			gap: 4,
			fields: fields as BaseUpdateFormField[],
		}];
	}, [fields, columns]);

	return (
		<form
			onSubmit={handleSubmit}
			className="form-container"
			{...(dataTestId ? { 'data-test-id': dataTestId } : {})}
		>
			{(title || subtitle) && (
				<div className="flex flex-col gap-0">
					{title && title !== "" && (
						<div className="title p-1 pb-0 w-full mb-0 leading-tight">{title}</div>
					)}
					{subtitle && subtitle !== "" && (
						<div className="subtitle p-1 pt-0 w-full mb-0 leading-snug">{subtitle}</div>
					)}
				</div>
			)}
			<div>
			{resolvedGroups.map((group) => {
				const columnCount = Math.max(1, group.columns);
				const gapValue = typeof group.gap === "number" ? `${group.gap}px` : group.gap;
				const containerClass = columnCount > 1 ? "grid" : "flex flex-col";
				const containerStyle = columnCount > 1 ? { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, gap: gapValue ?? "4px" } : { gap: gapValue ?? "4px" };

				return (
					<div key={group.id} className="fs-form-group w-full">
						{group.title && <h4 className="text-base font-semibold text-foreground">{group.title}</h4>}
						{group.subtitle && <p className="text-sm text-muted-foreground">{group.subtitle}</p>}
						<div className={`${containerClass}`} style={containerStyle as React.CSSProperties}>
							{group.fields.map((field, index) => (
								<div key={`${group.id}-${field.name}-${index}`} className="mb-0">
									{renderField(field)}
								</div>
							))}
						</div>
					</div>
				);
			})}
			</div>
			<div className="form-actions">
				<div />
				<div className="flex gap-2">
					{cancelButton && onCancel && (
						<Button
							variant="outlined"
							type="button"
							onClick={onCancel}
							disabled={isSubmitting}
						>
							<div className="flex items-center justify-center min-h-[20px]">
								{cancelButtonText}
							</div>
						</Button>
					)}
					{isSubmitting ? (
						<Button variant={submitVariant} type="submit" disabled data-test-id="submit-button">
							<div className="flex items-center justify-center min-h-[20px]">
								<DotProgress size={12} />
							</div>
						</Button>
					) : (
						<Button variant={submitVariant} type="submit" data-test-id="submit-button">
							<div className="flex items-center justify-center min-h-[20px]">
								{submitLabel ?? "Actualizar"}
							</div>
						</Button>
					)}
				</div>
			</div>
			{errors.length > 0 && (
				<div className="flex flex-col gap-2 mt-4">
					{errors.map((err, i) => (
						<div key={i} className="text-red-600 text-sm">{err}</div>
					))}
				</div>
			)}
		</form>
	);
};

export default UpdateBaseForm;