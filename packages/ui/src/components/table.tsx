import React from "react";

export const TableContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <div className={`nexus-table-container ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <table className={`nexus-table ${className}`.trim()} {...props}>
    {children}
  </table>
);

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className = "", ...props }) => (
  <thead className={className} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ children, className = "", ...props }) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <tr className={className} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ children, className = "", ...props }) => (
  <th className={className} scope="col" {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ children, className = "", ...props }) => (
  <td className={className} {...props}>
    {children}
  </td>
);
