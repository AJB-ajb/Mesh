import "./Card.css";

interface CardProps {
  title: string;
  children: React.ReactNode;
  variant?: "default" | "elevated";
}

export function Card({ title, children, variant = "default" }: CardProps) {
  return (
    <div className={`card card--${variant}`}>
      <div className="card__header">
        <h3>{title}</h3>
      </div>
      <div className="card__body">{children}</div>
    </div>
  );
}
