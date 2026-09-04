import React from 'react';

export const cellStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '10px 12px',
    flex: 1,
    minWidth: 0,
};

export const rowStyle = (borderBottom = true) => ({
    display: 'flex',
    borderBottom: borderBottom ? '1px solid #ddd' : 'none',
});

export const getLabelStyle = (width) => ({
    minWidth: width,
    maxWidth: width,
    fontWeight: 'bold',
    fontSize: '13px',
    color: '#333',
    flexShrink: 0,
    paddingRight: '8px',
    paddingTop: '5px',
});

export const inputStyle = {
    flex: 1,
    padding: '5px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#333',
    fontFamily: 'inherit',
    background: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
};

export const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
};

export const SectionHeader = ({ title }) => (
    <div style={{
        background: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        padding: '10px 12px',
        fontWeight: 'bold',
        fontSize: '14px',
        color: '#333',
    }}>
        {title}
    </div>
);
