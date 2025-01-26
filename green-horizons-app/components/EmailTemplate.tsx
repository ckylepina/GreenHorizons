import * as React from 'react';

interface EmailTemplateProps {
  contact: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ contact }) => (
  <div>
    <h1>Welcome to Our Newsletter!</h1>
    <p>Thank you for subscribing, {contact}.</p>
    <p>We&apos;re excited to have you on board.</p>
  </div>
);