import type { BaseResponse } from "./types";

const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
  "ChoiceCategory.NameDuplicate": "Tên loại lựa chọn đã tồn tại",
  "ChoiceCategory.NotFound": "Không tìm thấy loại lựa chọn",
  "ChoiceCategory.InUse": "Loại lựa chọn đang được Set Menu sử dụng, không thể xoá",
  "SetMenu.NotASetMenu": "Món này chưa phải Set Menu",
  "SetMenu.SelfComponent": "Component không thể là chính món Set Menu",
  "SetMenu.ChoiceCategoryNotFound": "Loại lựa chọn không tồn tại hoặc đã ngừng dùng",
  "SetMenu.ComponentNotFound": "Món component không tồn tại",
  "Item.NotFound": "Không tìm thấy món",
  "DiscountPolicy.NotFound": "Không tìm thấy chính sách giảm giá",
  "DiscountPolicy.CodeDuplicate": "Mã chính sách giảm giá đã tồn tại",
  "DiscountPolicy.InUse": "Chính sách đang được hoá đơn dùng — hãy tắt kích hoạt thay vì xoá",
  "DiscountPolicy.ItemNotFound": "Món trong điều kiện không tồn tại",
  "DiscountPolicy.AreaNotFound": "Khu vực trong điều kiện không tồn tại",
  "KitchenStation.NotFound": "Không tìm thấy bếp con",
  "KitchenStation.CodeDuplicate": "Mã bếp con đã tồn tại",
  "KitchenStation.InUse": "Bếp con đang được món hàng sử dụng — hãy tắt kích hoạt thay vì xoá",
  "CancellationReason.NotFound": "Không tìm thấy lý do huỷ/trả",
  "CancellationReason.CodeDuplicate": "Mã lý do đã tồn tại",
  "CancellationReason.InUse": "Lý do đã được dùng trong đơn hàng — hãy tắt kích hoạt thay vì xoá",
  "Shift.NotFound": "Không tìm thấy ca làm việc",
  "Shift.CodeDuplicate": "Mã ca đã tồn tại",
  "Shift.InUse": "Ca đang được phiên quầy/hoá đơn sử dụng — hãy tắt kích hoạt thay vì xoá",
  "ItemUomConversion.DuplicateUom": "Đơn vị quy đổi này đã tồn tại cho item",
  "ItemUomConversion.CannotChangeUom": "Không được đổi đơn vị tính khi cập nhật",
  "BomLine.SameItem": "Nguyên liệu không thể trùng với món bán",
  "BomLine.MaterialMustBeStockable": "Nguyên liệu phải là hàng quản kho (IsStockable)",
  "BomLine.MaterialAlreadyHasRecipe": "Nguyên liệu không được có công thức riêng (v1)",
  "BomLine.InvalidMaterialUom": "Đơn vị không hợp lệ cho nguyên liệu (phải là ĐVT cơ bản hoặc có quy đổi)",
  "BomLine.DuplicateMaterial": "Nguyên liệu này đã có trong công thức",
  "StockMovement.ItemNotFound": "Không tìm thấy item",
  "StockMovement.ItemNotStockable": "Chỉ item có IsStockable mới có thể nhập/xuất kho",
  "StockMovement.InvalidUom": "Đơn vị không hợp lệ (phải là ĐVT cơ bản hoặc có quy đổi của item)",
  "StockMovement.QuantityNotPositive": "Số lượng phải lớn hơn 0",
};

/**
 * Build a user-facing string from an API error response.
 *
 * Backend Rpom returns RFC 7807 ProblemDetails. For `General.Validation`
 * failures the per-field messages live in `extensions.errors[]`, while
 * `detail` is only the generic "One or more validation errors occurred".
 * Showing just `detail` masks the real reason, so we splice the field
 * errors in when present.
 */
export function formatApiError<T>(res: BaseResponse<T>): string {
  if (res.isSuccess) return "";
  const extensions = res.extensions as {
    errors?: Array<{ code?: string; description?: string }>;
  } | null;
  const fieldErrors = extensions?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const fromFields = fieldErrors
      .map(e => e.description || (e.code ? BUSINESS_ERROR_MESSAGES[e.code] : undefined))
      .filter((s): s is string => Boolean(s));
    if (fromFields.length > 0) return fromFields.join("\n");
  }
  if (res.title && BUSINESS_ERROR_MESSAGES[res.title]) {
    return BUSINESS_ERROR_MESSAGES[res.title];
  }
  return res.detail || res.title || "Lỗi không xác định";
}
