import React from "react";
import { Modal, Button, Input, Textarea } from "@edumind/user-ui";
import type { SectionDetailResponse } from "@edumind/shared-types";

interface SectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionForm: { title: string; description: string };
  setSectionForm: React.Dispatch<React.SetStateAction<{ title: string; description: string }>>;
  editingSection: SectionDetailResponse | null;
  onSave: () => void;
  saving: boolean;
}

export const SectionModal: React.FC<SectionModalProps> = ({
  isOpen,
  onClose,
  sectionForm,
  setSectionForm,
  editingSection,
  onSave,
  saving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSection ? "Edit Section" : "Add Section"}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Section Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={sectionForm.title}
            onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g., Introduction to React"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <Textarea
            value={sectionForm.description}
            onChange={(e) => setSectionForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Brief description of this section"
          />
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            isLoading={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {editingSection ? "Update Section" : "Create Section"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

