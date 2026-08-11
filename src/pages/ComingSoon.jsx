import { BiSolidWrench } from 'react-icons/bi';

function ComingSoon({ title, description }) {
  return (
    <main className="content">
      <section className="coming-soon">
        <span className="coming-soon-icon">
          <BiSolidWrench />
        </span>
        <h1 className="coming-soon-title">{title}</h1>
        <p className="coming-soon-desc">
          {description || 'This page is under construction and will be available soon.'}
        </p>
      </section>
    </main>
  );
}

export default ComingSoon;