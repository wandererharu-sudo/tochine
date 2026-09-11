export default function DetailSection({ id, title, description, children, onToggle }) {
  return (
    <details id={id} className="detail-section" onToggle={onToggle}>
      <summary><span>{title}<small>{description}</small></span></summary>
      <div className="detail-body">{children}</div>
    </details>
  )
}
