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
    ["registerPatient", registerPatient, new FormData()],
    ["updatePatientRecord", updatePatientRecord, new FormData()],
    ["openVisit", openVisit, new FormData()],
    ["updateVisitRecord", updateVisitRecord, new FormData()],
    ["createPrescriptionAction", createPrescriptionAction, new FormData()],
    ["sendPrescriptionToPharmacyAction", sendPrescriptionToPharmacyAction, new FormData()],
    ["dispensePrescriptionAction", dispensePrescriptionAction, new FormData()],
  ])("rejects direct invocation of %s before reaching the domain mutation", async (_name, action, formData) => {
    const previousState = { message: "", success: false };

    await expect(
      action === updatePatientRecord
        ? action(previousState, formData)
        : action(formData),
    ).rejects.toThrow("FORBIDDEN");

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
