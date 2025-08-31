import React from "react"

type Column<T> = {
    header: string
    accessor: keyof T
}

type TableProps<T> = {
    data: T[]
    columns: Column<T>[]
}

export function Table<T>({ data, columns }: TableProps<T>) {
    return (
        <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full border-collapse bg-white">
                <thead>
                    <tr className="bg-gray-100 text-left">
                        {columns.map((col, i) => (
                            <th key={i} className="px-4 py-2 border-b font-semibold">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            {columns.map((col, j) => (
                                <td key={j} className="px-4 py-2 border-b">
                                    {String(row[col.accessor])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
