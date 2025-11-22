import React from 'react';
import { Link } from 'react-router-dom';

const AdminFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-y-4 sm:flex-row">
          <p className="text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
            &copy; {currentYear} Prompthub, Inc. All rights reserved.
          </p>
          <Link to="/" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
            Back to Site
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;
