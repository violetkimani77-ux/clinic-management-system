import { requireClinicPermission } from "@/lib/auth/guards";
import { registerPatient, updatePatientRecord } from "@/../app/patients/actions";
import { openVisit, updateVisitRecord } from "@/../app/visits/actions";
import {
  createPrescriptionAction,
  sendPrescriptionToPharmacyAction,
} from "@/../app/visits/prescription-actions";
import { dispensePrescriptionAction } from "@/../app/pharmacy/actions";
import { createPatient, updatePatient } from "@/lib/patients/registry";
import { createVisit, updateVisit } from "@/lib/visits/registry";
import {
  createPrescription,
  sendPrescriptionToPharmacy,
} from "@/lib/prescriptions/registry";
import { dispensePrescription } from "@/lib/pharmacy/registry";

jest.mock("@/lib/auth/guards", () => ({
  requireClinicPermission: jest.fn(),
}));

jest.mock("@/lib/patients/registry", () => ({
  createPatient: jest.fn(),
  updatePatient: jest.fn(),
}));

jest.mock("@/lib/visits/registry", () => ({
  createVisit: jest.fn(),
  updateVisit: jest.fn(),
}));

jest.mock("@/lib/prescriptions/registry", () => ({
  createPrescription: jest.fn(),
  sendPrescriptionToPharmacy: jest.fn(),
}));

jest.mock("@/lib/pharmacy/registry", () => ({
  dispensePrescription: jest.fn(),
}));

const requireClinicPermissionMock = jest.mocked(requireClinicPermission);

describe("server action authorization boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireClinicPermissionMock.mockRejectedValue(new Error("FORBIDDEN"));
  });

  it.each([
    ["registerPatient", (formData: FormData) => registerPatient(formData)],
    [
      "updatePatientRecord",
      (formData: FormData) => updatePatientRecord({ message: "", success: false }, formData),
    ],
    ["openVisit", (formData: FormData) => openVisit(formData)],
    ["updateVisitRecord", (formData: FormData) => updateVisitRecord(formData)],
    ["createPrescriptionAction", (formData: FormData) => createPrescriptionAction(formData)],
    [
      "sendPrescriptionToPharmacyAction",
      (formData: FormData) => sendPrescriptionToPharmacyAction(formData),
    ],
    ["dispensePrescriptionAction", (formData: FormData) => dispensePrescriptionAction(formData)],
  ])("rejects direct invocation of %s before reaching the domain mutation", async (_name, invoke) => {
    await expect(invoke(new FormData())).rejects.toThrow("FORBIDDEN");

    expect(requireClinicPermissionMock).toHaveBeenCalledTimes(1);
    expect(createPatient).not.toHaveBeenCalled();
    expect(updatePatient).not.toHaveBeenCalled();
    expect(createVisit).not.toHaveBeenCalled();
    expect(updateVisit).not.toHaveBeenCalled();
    expect(createPrescription).not.toHaveBeenCalled();
    expect(sendPrescriptionToPharmacy).not.toHaveBeenCalled();
    expect(dispensePrescription).not.toHaveBeenCalled();
  });
});
