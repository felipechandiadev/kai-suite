
"use client";
import React, { useState } from "react";
import {
  TextField,
  AutoComplete,
  Button,
  DotProgress,
  Alert,
  Switch,
  Select,
  RangeSlider,
  NumberStepper,
} from "@kai/ui";
import type { Option } from "@kai/ui";
import LocationPickerWrapper from "../LocationPicker/LocationPickerWrapper";
import { MultimediaField } from "@/shared/components/Multimedia";

export interface BaseFormField {
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
	autoFocus?: boolean;
	options?: Option[];
	multiline?: boolean;
	rows?: number;
	formatFn?: (input: string) => string;
	startSymbol?: string;
	endSymbol?: string;
	min?: number;
	max?: number;
	step?: number; // step used by numberStepper
	labelPosition?: 'left' | 'right';
	passwordVisibilityToggle?: boolean; // Mostrar/ocultar toggle de visibilidad para password
	// Props para campos multimedia
	acceptedTypes?: string[];
	maxSize?: number;
	uploadPath?: string;
	buttonText?: string;
}

export interface BaseFormFieldGroup {
	id?: string;
	title?: string;
	subtitle?: string;
	columns?: number;
	gap?: number;
	fields: BaseFormField[];
}

type CreateBaseFormFields = BaseFormField[] | BaseFormFieldGroup[];

export interface CreateBaseFormProps {
	fields: CreateBaseFormFields;
	values: Record<string, any>;
	onChange: (field: string, value: any) => void;
	onSubmit: () => void;
	isSubmitting?: boolean;
	submitLabel?: string;
	title?: string;
	subtitle?: string;
	errors?: string[];
	["data-test-id"]?: string;
	columns?: number;
	cancelButton?: boolean;
	cancelButtonText?: string;
	onCancel?: () => void;
	validate?: (values: Record<string, any>) => string[];
}

const isFieldGroupArray = (items: CreateBaseFormFields): items is BaseFormFieldGroup[] => {
	return Array.isArray(items) && items.length > 0 && Boolean((items[0] as BaseFormFieldGroup).fields);
};

const CreateBaseForm: React.FC<CreateBaseFormProps> = ({
	fields,
	values,
	onChange,
	onSubmit,
	isSubmitting = false,
	submitLabel,
	title = "",
	subtitle = "",
	errors = [],
	columns = 1,
	cancelButton = false,
	cancelButtonText = "Cerrar",
	onCancel,
	validate,
	...props
}) => {
	const dataTestId = props["data-test-id"];

	// Función para renderizar un campo individual
	const renderField = (field: BaseFormField) => (
		<div key={field.name} className={field.type === "location" ? "mb-6" : "mb-0"}>
			{field.type === "location" ? (
				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						{field.label}
					</label>
					<div className="relative z-10">
						{values[field.name] ? (
							<LocationPickerWrapper
								mode="update"
								externalPosition={values[field.name]}
								onChange={coords => onChange(field.name, coords)}
							/>
						) : (
							<LocationPickerWrapper
								mode="edit"
								initialLat={-33.4489}
								initialLng={-70.6693}
								onChange={coords => onChange(field.name, coords)}
							/>
						)}
					</div>
				</div>
			) : field.type === "range" ? (
				<RangeSlider
					min={field.min ?? 0}
					max={field.max ?? 100}
					value={values[field.name]}
					onChange={val => onChange(field.name, val)}
				/>
			) : field.type === "select" ? (
				<Select
					options={field.options || []}
					placeholder={field.label}
					value={values[field.name]}
					onChange={(id: string | number | null) => onChange(field.name, id)}
					required={field.required}
					data-test-id={`select-${field.name}`}
				/>
			) : field.type === "autocomplete" ? (
				<AutoComplete
					options={field.options || []}
					label={field.label}
					value={field.options?.find(opt => opt.id === values[field.name]) || null}
					onChange={opt => onChange(field.name, opt?.id || "")}
					required={field.required}
					name={field.name}
					data-test-id={`autocomplete-${field.name}`}
				/>
			) : field.type === "switch" ? (
				<Switch
					checked={Boolean(values[field.name])}
					onChange={val => onChange(field.name, val)}
					label={field.label}
					labelPosition={field.labelPosition || 'left'}
					data-test-id={`switch-${field.name}`}
				/>
			) : field.type === "numberStepper" ? (
				<NumberStepper
					label={field.label}
					value={typeof values[field.name] === 'number' ? values[field.name] : (field.min ?? 0)}
					onChange={(val) => onChange(field.name, val)}
					min={field.min}
					max={field.max}
					step={field.step ?? 1}
					data-test-id={`number-stepper-${field.name}`}
				/>
			) : field.type === "image" || field.type === "video" || field.type === "avatar" ? (
				<div>
					<label className="block text-sm font-medium text-foreground mb-2">
						{field.label}
					</label>
					<MultimediaField
						mode="staging"
						layout={field.type === 'avatar' ? 'single' : 'collection'}
						singleVariant={field.type === 'avatar' ? 'avatar' : undefined}
						onChange={(files) => {
							if (files.length > 0) {
								onChange(field.name, files[0]);
							}
						}}
						accept={field.acceptedTypes?.join(',') || (field.type === 'video' ? 'video/*' : 'image/*')}
						maxSizeMb={field.maxSize || (field.type === 'avatar' ? 2 : 5)}
					/>
				</div>
			) : (
				<TextField
					label={field.label}
					value={values[field.name] || ""}
					onChange={e => onChange(field.name, field.formatFn ? field.formatFn(e.target.value) : e.target.value)}
					type={field.type}
					name={field.name}
					rows={field.multiline ? field.rows : undefined}
					startSymbol={field.startSymbol}
					endSymbol={field.endSymbol}
					required={field.required}
					passwordVisibilityToggle={field.passwordVisibilityToggle}
					data-test-id={`input-${field.name}`}
				/>
			)}
		</div>
	);

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
			fields: fields as BaseFormField[],
		}];
	}, [fields, columns]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (validate) {
					const validationErrors = validate(values);
					if (validationErrors.length > 0) {
						// Los errores se pasan a través de la prop errors del componente padre
						return;
					}
				}
				onSubmit();
			}}
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
			<div className="space-y-4">
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
						<Button variant="primary" type="submit" disabled data-test-id="submit-button">
							<div className="flex items-center justify-center min-h-[20px]">
								<DotProgress size={12} />
							</div>
						</Button>
					) : (
						<Button variant="primary" type="submit" data-test-id="submit-button">
							<div className="flex items-center justify-center min-h-[20px]">
								{submitLabel ?? "Guardar"}
							</div>
						</Button>
					)}
				</div>
			</div>
			{errors.length > 0 && (
				<div className="flex flex-col gap-2 mt-4">
					{errors.map((err, i) => (
						<Alert key={i} variant="error">{err}</Alert>
					))}
				</div>
			)}
		</form>
	);
};

export default CreateBaseForm;


