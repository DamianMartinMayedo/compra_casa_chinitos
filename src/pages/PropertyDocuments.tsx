import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Checklist from '../components/Checklist';

function PropertyDocuments() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState('');

  useEffect(() => {
    fetch(`/api/properties/${id}`).then(r => r.json()).then(d => setName(d.name)).catch(() => {});
  }, [id]);

  return (
    <div className="container page">
      <Link to={`/property/${id}`} className="back-link">← Volver a {name || 'la casa'}</Link>
      <div className="page-head">
        <div>
          <h1>Documentos a pedir</h1>
          <p className="page-head__sub">{name}</p>
        </div>
      </div>
      <Checklist propertyId={id!} mode="documents" />
    </div>
  );
}

export default PropertyDocuments;
