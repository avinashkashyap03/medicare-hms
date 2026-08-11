function WidgetHeader({ title, subtitle, action }) {
  return (
    <div className="widget-head">
      <div>
        <h3 className="widget-title">{title}</h3>
        {subtitle && <p className="widget-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="widget-head-action">{action}</div>}
    </div>
  );
}

export default WidgetHeader;