import NamedRecordsPage from '../components/NamedRecordsPage';

export default function Brands() {
  return (
    <NamedRecordsPage
      singular="Brand"
      plural="Brands"
      permissionPrefix="brands"
      endpoint="/api/brands"
      description="Organize inventory by brand."
    />
  );
}
