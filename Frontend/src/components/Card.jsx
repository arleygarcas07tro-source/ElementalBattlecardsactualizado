import React from 'react';
import './Card.css';

export default function Card({ title, desc, image, icon }) {
  return (
    <div className="card">
      <div
        className="card-image"
        style={{ backgroundImage: `url(${image})` }}
        role="img"
        aria-label={title}
      />
      <div className="card-body">
        <div className="card-icon">{icon}</div>
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{desc}</p>
      </div>
    </div>
  );
}
