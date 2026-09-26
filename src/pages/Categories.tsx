import NamedRecordsPage from '../components/NamedRecordsPage';

export default function Categories() {
  return (
    <NamedRecordsPage
      singular="Category"
      plural="Categories"
      permissionPrefix="categories"
      endpoint="/api/categories"
      description="Group products into categories."
    />
  );
}
