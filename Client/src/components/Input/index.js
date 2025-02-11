import React from 'react'

const Input = ({
    label = '',
    name = '',
    type = 'text',
    className = '', 
    isRequired = false,
    placeholder = '',
    value = '',
    onChange = () => {

    },
}) => {
  return (
    <div className='w-1/2'>
      <label htmlFor={name} className='block mb-2 my-4 font-medium'>{label}</label>
      <input type={type} id={name} className={`bg-gray-50 border text-gray-900 text-5m rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full p-2.5 outline outline-1 outline-black ${className}`}
      placeholder = {placeholder} required={isRequired} value={value} onChange={onChange}/>
    </div>

  )
}

export default Input
