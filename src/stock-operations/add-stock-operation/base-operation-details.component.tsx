import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StockOperationDTO } from "../../core/api/types/stockOperation/StockOperationDTO";
import { SaveStockOperation } from "../../stock-items/types";
import {
  operationFromString,
  OperationType,
  StockOperationType,
} from "../../core/api/types/stockOperation/StockOperationType";
import {
  DATE_PICKER_CONTROL_FORMAT,
  DATE_PICKER_FORMAT,
  formatForDatePicker,
  today,
} from "../../constants";
import {
  Button,
  DatePicker,
  DatePickerInput,
  InlineLoading,
  TextInput,
  ComboBox,
} from "@carbon/react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { operationSchema, StockOperationFormData } from "../validation-schema";
import { ArrowRight } from "@carbon/react/icons";
import PartySelector from "../party-selector/party-selector.component";
import UsersSelector from "../users-selector/users-selector.component";
import { otherUser } from "../../core/utils/utils";
import ControlledTextInput from "../../core/components/carbon/controlled-text-input/controlled-text-input.component";
import StockOperationReasonSelector from "../stock-operation-reason-selector/stock-operation-reason-selector.component";
import ControlledTextArea from "../../core/components/carbon/controlled-text-area/controlled-text-area.component";
import { InitializeResult } from "./types";
import rootStyles from "../../root.scss";
import { ResourceRepresentation } from "../../core/api/api";
import { useStockOperationPages } from "../stock-operations-table.resource";
import { useStockOperationContext } from "./stock-operation-context/useStockOperationContext";
import {
  createBaseOperationPayload,
  getRequisitionStockOperations,
} from "./add-stock-utils";

interface BaseOperationDetailsProps {
  isEditing?: boolean;
  canEdit?: boolean;
  model?: StockOperationDTO;
  onSave?: SaveStockOperation;
  operation: StockOperationType;
  setup: InitializeResult;
}

const BaseOperationDetails: React.FC<BaseOperationDetailsProps> = ({
  model,
  onSave,
  operation,
  canEdit,
  isEditing,
  setup: {
    requiresStockAdjustmentReason: showReason,
    shouldLockSource: lockSource,
    shouldLockDestination: lockDestination,
    sourcePartyList,
    destinationPartyList,
  },
}) => {
  const { t } = useTranslation();
  const { setFormContext } = useStockOperationContext();
  const { isLoading, items } = useStockOperationPages({
    v: ResourceRepresentation.Full,
    totalCount: true,
  });
  const requisitionStockOperations = getRequisitionStockOperations(items);
  const operationType = operationFromString(operation.operationType);
  const StockIssueOperationType = OperationType.STOCK_ISSUE_OPERATION_TYPE;

  const {
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<StockOperationFormData>({
    defaultValues: model,
    mode: "all",
    resolver: zodResolver(operationSchema(operationType)),
  });

  const [isOtherUser, setIsOtherUser] = useState<boolean | null>();
  const [isSaving, setIsSaving] = useState(false);
  if (isLoading) {
    return (
      <InlineLoading
        status="active"
        iconDescription="Loading"
        description="Loading data..."
      />
    );
  }
console.log("Model",model);
console.log("Item",requisitionStockOperations);
  const handleSave = async (item: StockOperationDTO) => {
    console.log("Here1");
    try {
      setIsSaving(true);
      const payload = createBaseOperationPayload(model, item, operationType);
      console.log("Here");
      console.log("Payload", payload);
      await onSave(payload);
    } catch (e) {
      // Show notification
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div style={{ margin: "10px" }}>
      <form
        className={`${rootStyles.formContainer} ${rootStyles.verticalForm}`}
      >
        {operationType === OperationType.STOCK_ISSUE_OPERATION_TYPE && (
          <Controller
            control={control}
            name="requisitionStockOperationUuid"
            render={({ field }) => (
              <ComboBox
                id="requisitionStockOperationUuid"
                items={requisitionStockOperations}
                onChange={(data: { selectedItem: StockOperationDTO }) => {
                  field.onChange(data.selectedItem.uuid);
                  Object.assign(
                    model.stockOperationItems,
                    data.selectedItem.stockOperationItems
                  );
                  setFormContext({
                    stockItems: data.selectedItem.stockOperationItems,
                  });
                }}
                itemToString={(item) => `${item?.operationNumber}` ?? ""}
                titleText={t("requisitionStockOperation", "Requisition")}
                invalid={!!errors.requisitionStockOperationUuid}
                invalidText={errors.requisitionStockOperationUuid?.message}
                placeholder={t("chooseARequisition", "Choose a requisition")}
              />
            )}
          />
        )}

        {canEdit && (
          <Controller
            control={control}
            render={({ field: { onChange } }) => (
              <DatePicker
                datePickerType="single"
                maxDate={formatForDatePicker(today())}
                locale="en"
                dateFormat={DATE_PICKER_CONTROL_FORMAT}
                onChange={onChange}
              >
                <DatePickerInput
                  invalid={!!errors.operationDate}
                  invalidText={errors?.operationDate?.message}
                  id="operationDate"
                  name="operationDate"
                  placeholder={DATE_PICKER_FORMAT}
                  labelText={t("operationDate", "Operation Date")}
                  value={formatForDatePicker(model?.operationDate)}
                />
              </DatePicker>
            )}
            name="operationDate"
          />
        )}

        {!canEdit && (
          <>
            <TextInput
              id="operationDateLbl"
              value={formatForDatePicker(model?.operationDate)}
              readOnly={true}
              labelText="Operation Date"
            />
          </>
        )}

        {isEditing && model?.operationNumber && (
          <TextInput
            id="operationNoLbl"
            value={model?.operationNumber}
            readOnly={true}
            labelText={"Operation Number"}
          />
        )}

        {canEdit && !lockSource && operation?.hasDestination && (
          <PartySelector
            controllerName="sourceUuid"
            name="sourceUuid"
            control={control}
            title={
              operation?.hasDestination
                ? t("from", "From")
                : t("location:", "Location")
            }
            placeholder={
              operation.hasDestination
                ? t("chooseASource", "Choose a source")
                : t("chooseALocation", "Choose a location")
            }
            invalid={!!errors.destinationUuid}
            invalidText={
              errors.destinationUuid && errors?.destinationUuid?.message
            }
            parties={sourcePartyList || []}
          />
        )}
        {(!canEdit || isEditing || lockSource) && StockIssueOperationType && (
          <TextInput
            id="sourceUuidLbl"
            value={
              requisitionStockOperations.map((item) =>
                item.destinationName ? item.destinationName : ""
              )[0]
            }
            readOnly={true}
            labelText={operation?.hasDestination ? "From" : "From"}
          />
        )}
        {(!canEdit || isEditing || lockSource) && !StockIssueOperationType && (
          <TextInput
            id="sourceUuidLbl"
            value={model?.destinationName ?? ""}
            readOnly={true}
            labelText={operation?.hasDestination ? "From" : "From"}
          />
        )}
        {canEdit && !lockDestination && operation?.hasSource && (
          <PartySelector
            controllerName="destinationUuid"
            name="destinationUuid"
            control={control}
            title={operation?.hasSource ? "To" : "Location"}
            placeholder={
              operation?.hasSource
                ? t("chooseADestination", "Choose a destination")
                : "Location"
            }
            invalid={!!errors.sourceUuid}
            invalidText={
              errors.sourceUuid && errors?.sourceUuid?.message
            }
            parties={destinationPartyList || []}
          />
        )}
        {(!canEdit || isEditing || lockDestination) &&
          StockIssueOperationType && (
            <TextInput
              id="destinationUuidLbl"
              value={
                requisitionStockOperations.map((item) =>
                  item.sourceName ? item.sourceName : ""
                )[0]
              }
              readOnly={true}
              labelText={operation?.hasSource ? "To5" : "To"}
            />
          )}
        {(!canEdit || isEditing || lockDestination) &&
          !StockIssueOperationType && (
            <TextInput
              id="destinationUuidLbl"
              value={model?.sourceName ?? ""}
              readOnly={true}
              labelText={operation?.hasSource ? "To5" : "To"}
            />
          )}

        {canEdit && (
          <UsersSelector
            controllerName="responsiblePersonUuid"
            name="responsiblePersonUuid"
            control={control}
            title={t("responsiblePerson:", "Responsible Person")}
            placeholder={t("filter", "Filter ...")}
            invalid={!!errors.responsiblePersonUuid}
            invalidText={
              errors.responsiblePersonUuid &&
              errors?.responsiblePersonUuid?.message
            }
            onUserChanged={(user) => {
              if (user?.uuid === otherUser.uuid) {
                setIsOtherUser(true);
              }
            }}
          />
        )}

        {isOtherUser && (
          <ControlledTextInput
            id="responsiblePersonOther"
            name="responsiblePersonOther"
            control={control}
            controllerName="responsiblePersonOther"
            maxLength={255}
            size={"md"}
            value={`${model?.responsiblePersonOther ?? ""}`}
            labelText={t("responsiblePerson", "Responsible Person")}
            placeholder={t("pleaseSpecify", "Please Specify")}
            invalid={!!errors.responsiblePersonOther}
            invalidText={
              errors.responsiblePersonOther &&
              errors?.responsiblePersonOther?.message
            }
          />
        )}
        {!canEdit && StockIssueOperationType && (
          <TextInput
            id="responsiblePersonLbl"
            value={
              requisitionStockOperations.map((item) =>
                item.responsiblePersonFamilyName
                  ? `${item.responsiblePersonFamilyName} ${item.responsiblePersonGivenName}`
                  : ""
              )[0]
            }
            readOnly={true}
            labelText={"Responsible Person"}
          />
        )}
        {!canEdit && !StockIssueOperationType && (
          <TextInput
            id="responsiblePersonLbl"
            value={
              (model?.responsiblePersonUuid &&
              model?.responsiblePersonUuid !== otherUser.uuid
                ? `${model?.responsiblePersonFamilyName} ${model?.responsiblePersonGivenName}`
                : model?.responsiblePersonOther) ?? ""
            }
            readOnly={true}
            labelText={"Responsible Person"}
          />
        )}

        {showReason && canEdit && (
          <StockOperationReasonSelector
            controllerName="reasonUuid"
            name="reasonUuid"
            control={control}
            placeholder={t("chooseAReason", "Choose a reason")}
            title={t("reason", "Reason")}
            invalid={!!errors.reasonUuid}
            invalidText={errors.reasonUuid && errors?.reasonUuid?.message}
            onReasonChange={(reason) => {
              setValue("reasonUuid", reason.uuid);
            }}
          />
        )}

        {showReason && !canEdit && (
          <TextInput
            id="reasonUuidLbl"
            value={model?.reasonName ?? ""}
            readOnly={true}
            labelText={"Reason:"}
          />
        )}

        <ControlledTextArea
          id="remarks"
          name="remarks"
          control={control}
          controllerName="remarks"
          maxLength={255}
          value={`${model?.remarks ?? ""}`}
          labelText={t("remarks:", "Remarks")}
          invalid={!!errors.remarks}
          invalidText={errors.remarks && errors?.remarks?.message}
        />

        <div style={{ display: "flex", flexDirection: "row-reverse" }}>
          <Button
            name="save"
            type="button"
            className="submitButton"
            onClick={handleSubmit(handleSave)}
            kind="primary"
            renderIcon={ArrowRight}
          >
            {isSaving ? <InlineLoading /> : t("next", "Next")}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BaseOperationDetails;
