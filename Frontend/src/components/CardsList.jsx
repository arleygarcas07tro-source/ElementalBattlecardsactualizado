import React from 'react';
import Card from './Card';
import './Card.css';
import { FaCrossedSwords, FaUsers, FaBookOpen } from 'react-icons/fa';

const cards = [
  {
    title: 'NIVELES',
    desc: 'Enfréntate a oponentes en partidas igualadas.',
    image: '/images/niveles.jpg',
    icon: <FaCrossedSwords />,
  },
  {
    title: 'JUEGO EN LÍNEA',
    desc: 'Juega sin compromiso y diviértete.',
    image: '/images/online.jpg',
    icon: <FaUsers />,
  },
  {
    title: 'MECÁNICAS',
    desc: 'Aprende las reglas y domina las estrategias.',
    image: '/images/mecanicas.jpg',
    icon: <FaBookOpen />,
  },
];

export default function CardsList() {
  return (
    <div className="cards">
      {cards.map((card, index) => (
        <Card key={index} {...card} />
      ))}
    </div>
  );
}
