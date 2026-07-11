"use client";
import React from "react";
import { Button, DotProgress, Alert } from "@kai/ui";
import { Trash2 } from "lucide-react";

export interface DeleteBaseFormProps {
    message: string;
    onSubmit: () => void;
    isSubmitting?: boolean;
    title?: string;
    subtitle?: string;
    submitLabel?: string;
    errors?: string[];
    ["data-test-id"]?: string;
    cancelButton?: boolean;
    cancelButtonText?: string;
    onCancel?: () => void;
}

const DeleteBaseForm: React.FC<DeleteBaseFormProps> = ({
    message,
    onSubmit,
    isSubmitting = false,
    title = "Confirmar eliminación",
    subtitle,
    submitLabel,
    errors = [],
    cancelButton = false,
    cancelButtonText = "Cerrar",
    onCancel,
    ...props
}) => {
    const dataTestId = props["data-test-id"];

    return (
        <div
            className="flex flex-col w-full"
            data-test-id={dataTestId || "delete-base-form-root"}
        >
            {/* Encabezado */}
            {(title || subtitle) && (
                <div className="px-6 py-4 border-b border-border">
                    {title && title !== "" && (
                        <h2 className="text-lg font-bold text-foreground">{title}</h2>
                    )}
                    {subtitle && subtitle !== "" && (
                        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                    )}
                </div>
            )}

            {/* Contenido */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="flex flex-col flex-grow"
            >
                <div className="px-6 py-6 space-y-4 flex-grow">
                    {/* Ícono */}
                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center border border-red-200">
                            <Trash2 size={24} strokeWidth={1.5} className="text-red-500" />
                        </div>
                    </div>

                    {/* Mensaje */}
                    <p className="text-center text-base text-foreground leading-relaxed">
                        {message}
                    </p>

                    {/* Errores */}
                    {errors.length > 0 && (
                        <div className="flex flex-col gap-2 mt-4">
                            {errors.map((err, i) => (
                                <Alert key={i} variant="error">
                                    {err}
                                </Alert>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer con botones */}
                <div className="px-6 py-4 border-t border-border flex gap-3 justify-between">
                    {cancelButton && onCancel && (
                        <Button
                            variant="outlined"
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="min-w-[100px]"
                        >
                            <div className="flex items-center justify-center min-h-[20px]">
                                {cancelButtonText}
                            </div>
                        </Button>
                    )}
                    {isSubmitting ? (
                        <Button
                            variant="primary"
                            type="submit"
                            disabled
                            className="min-w-[100px] rounded-full bg-red-600/20 hover:bg-red-600/20"
                        >
                            <div className="flex items-center justify-center min-h-[20px]">
                                <DotProgress size={12} />
                            </div>
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            type="submit"
                            className="min-w-[100px] rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                            <div className="flex items-center justify-center min-h-[20px]">
                                {submitLabel ?? "Eliminar"}
                            </div>
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default DeleteBaseForm;
