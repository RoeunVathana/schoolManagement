import { useState } from 'react';

const remoteLogo = 'https://i.pinimg.com/1200x/70/01/e0/7001e00fd5b7f2745c5e91ff547f4763.jpg';

export default function BrandLogo({ className = '' }) {
  const [source, setSource] = useState(remoteLogo);

  return <img src={source} alt="CampusFlow logo" referrerPolicy="no-referrer" className={className} onError={() => setSource('/campusflow-logo.jpg')} />;
}
