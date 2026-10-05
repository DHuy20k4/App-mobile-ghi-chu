/**
 * Chuẩn hóa chuỗi tiếng Việt bỏ dấu và chuyển về chữ thường để hỗ trợ tìm kiếm gần đúng
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Kiểm tra xem chuỗi nguồn (target) có chứa từ khóa tìm kiếm (searchQuery) hay không (không phân biệt dấu và hoa/thường)
 */
export function matchVietnameseSearch(target: string, searchQuery: string): boolean {
  const normalizedTarget = removeVietnameseAccents(target);
  const normalizedQuery = removeVietnameseAccents(searchQuery);
  return normalizedTarget.includes(normalizedQuery);
}
