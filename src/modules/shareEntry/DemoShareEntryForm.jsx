import React, { useState, useEffect } from 'react';

export default function DemoShareEntryForm() {
  const [shareholdings, setShareholdings] = useState([]);
  const [formState, setFormState] = useState({
    name: '',
    quantity: '',
    shareCategory: '',
    subCategory: '',
    voting: '',
    vesting: '',
    price: 'Market Price',
    editIndex: null
  });
  // const [showSubcategory, setShowSubcategory] = useState(false);
  // const [showVoting, setShowVoting] = useState(false);
  // const [showVesting, setShowVesting] = useState(false);
  
  // const data = {
  //   "Common": {
  //     "Ordinary (Class A)": { "Voting": "Voting", "Vesting": "not applicable" },
  //     "Ordinary (Class B)": { "Voting": "Super-voting", "Vesting": "not applicable" },
  //     "Ordinary (Class C)": { "Voting": "Non-voting", "Vesting": "not applicable" },
  //     "Limited": { "Voting": "not applicable", "Vesting": "not applicable" }
  //   },
  //   "Preferred": {
  //     "Cumulative": { "Voting": "not applicable", "Vesting": "not applicable" },
  //     "Non-cumulative": { "Voting": "not applicable", "Vesting": "not applicable" },
  //     "Participating": { "Voting": "not applicable", "Vesting": "not applicable" },
  //     "Convertible": { "Voting": "not applicable", "Vesting": "not applicable" }
  //   },
  //   "Restricted": {
  //     "Stock Unit": [
  //       { "Voting": "Voting when exercised", "Vesting": "Graded vesting" },
  //       { "Voting": "Voting when exercised", "Vesting": "Cliff vesting" },
  //       { "Voting": "Voting when exercised", "Vesting": "Immediate vesting" }
  //     ],
  //     "Stock Award": [
  //       { "Voting": "Voting", "Vesting": "Graded vesting" },
  //       { "Voting": "Voting", "Vesting": "Cliff vesting" },
  //       { "Voting": "Voting", "Vesting": "Immediate vesting" }
  //     ],
  //     "Employee Stock Option": [
  //       { "Voting": "Voting when exercised", "Vesting": "Graded vesting" },
  //       { "Voting": "Voting when exercised", "Vesting": "Cliff vesting" },
  //       { "Voting": "Voting when exercised", "Vesting": "Immediate vesting" }
  //     ]
  //   }
  // };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value
    });
  };
  
  // const handleShareCategoryChange = (e) => {
  //   const selectedCategory = e.target.value;
  //   setFormState({
  //     ...formState,
  //     shareCategory: selectedCategory,
  //     subcategory: '',
  //     voting: '',
  //     vesting: ''
  //   });
  //   setShowSubcategory(false);
  //   setShowVoting(false);
  //   setShowVesting(false);
  
  //   if (selectedCategory && data[selectedCategory]) {
  //     setShowSubcategory(true);
  //   }
  // };
  
  // const handleSubcategoryChange = (e) => {
  //   const selectedSubcategory = e.target.value;
  //   setFormState({
  //     ...formState,
  //     subcategory: selectedSubcategory,
  //     voting: '',
  //     vesting: ''
  //   });
  //   setShowVoting(false);
  //   setShowVesting(false);
  
  //   if (formState.shareCategory && selectedSubcategory && data[formState.shareCategory][selectedSubcategory]) {
  //     const options = data[formState.shareCategory][selectedSubcategory];
  //     if (Array.isArray(options)) {
  //       setFormState({
  //         ...formState,
  //         votingOptions: options.map(option => option.Voting),
  //         vestingOptions: options.map(option => option.Vesting)
  //       });
  //       setShowVoting(true);
  //       setShowVesting(true);
  //     } else {
  //       setFormState({
  //         ...formState,
  //         voting: options.Voting,
  //         vesting: options.Vesting
  //       });
  //       if (options.Voting !== "not applicable") {
  //         setShowVoting(true);
  //       }
  //       if (options.Vesting !== "not applicable") {
  //         setShowVesting(true);
  //       }
  //     }
  //   }
  // };
  
  const options = {
    Common: {
      "Ordinary (Class A)": { voting: ["Voting", "Super-voting", "Non-voting"], vesting: ["not applicable"] },
      "Ordinary (Class B)": { voting: ["Voting", "Super-voting", "Non-voting"], vesting: ["not applicable"] },
      "Ordinary (Class C)": { voting: ["Voting", "Super-voting", "Non-voting"], vesting: ["not applicable"] },
      Limited: { voting: ["not applicable"], vesting: ["not applicable"] }
    },
    Preferred: {
      Cumulative: { voting: ["not applicable"], vesting: ["not applicable"] },
      "Non-cumulative": { voting: ["not applicable"], vesting: ["not applicable"] },
      Participating: { voting: ["not applicable"], vesting: ["not applicable"] },
      Convertible: { voting: ["not applicable"], vesting: ["not applicable"] }
    },
    Restricted: {
      "Stock Unit": { voting: ["Voting when exercised"], vesting: ["Graded vesting", "Cliff vesting", "Immediate vesting"] },
      "Stock Award": { voting: ["Voting"], vesting: ["Graded vesting", "Cliff vesting", "Immediate vesting"] },
      "Employee Stock Option": { voting: ["Voting when exercised"], vesting: ["Graded vesting", "Cliff vesting", "Immediate vesting"] }
    }
  };
  
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [voting, setVoting] = useState('');
  const [vesting, setVesting] = useState('');
  const [votingOptions, setVotingOptions] = useState([]);
  const [vestingOptions, setVestingOptions] = useState([]);
  
  useEffect(() => {
    if (votingOptions.length === 1) {
      setVoting(votingOptions[0]);
    }
  }, [votingOptions]);
  
  useEffect(() => {
    if (vestingOptions.length === 1) {
      setVesting(vestingOptions[0]);
    }
  }, [vestingOptions]);
  
  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    setCategory(selectedCategory);
    setSubCategory('');
    setVoting('');
    setVesting('');
    setVotingOptions([]);
    setVestingOptions([]);
  };
  
  const handleSubCategoryChange = (e) => {
    const selectedSubCategory = e.target.value;
    setSubCategory(selectedSubCategory);
    setVoting('');
    setVesting('');
    
    if (selectedSubCategory) {
      const selectedVotingOptions = options[category][selectedSubCategory].voting;
      const selectedVestingOptions = options[category][selectedSubCategory].vesting;
      
      if (selectedVotingOptions[0] !== "not applicable") {
        setVotingOptions(selectedVotingOptions);
      } else {
        setVotingOptions([]);
      }
      
      if (selectedVestingOptions[0] !== "not applicable") {
        setVestingOptions(selectedVestingOptions);
      } else {
        setVestingOptions([]);
      }
    } else {
      setVotingOptions([]);
      setVestingOptions([]);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (formState.editIndex !== null) {
      const updatedShareholdings = [...shareholdings];
      updatedShareholdings[formState.editIndex] = formState;
      setShareholdings(updatedShareholdings);
    } else {
      setShareholdings([...shareholdings, formState]);
    }
    // setFormState({
    //   name: '',
    //   quantity: '',
    //   category: '',
    //   subCategory: '',
    //   voting: '',
    //   vesting: '',
    //   price: 'Market Price',
    //   editIndex: null
    // });
  };
  
  const handleEdit = (index) => {
    setFormState({ ...shareholdings[index], editIndex: index });
  };
  
  const handleDelete = (index) => {
    const updatedShareholdings = [...shareholdings];
    updatedShareholdings.splice(index, 1);
    setShareholdings(updatedShareholdings);
  };
  
  return (
    <div>
    <form onSubmit={handleSubmit}>
    <label htmlFor="name">Description of Share Type:</label><br />
    <input type="text" id="name" name="name" value={formState.name} onChange={handleInputChange} /><br /><br />
    <label htmlFor="quantity">Quantity of Shares:</label><br />
    <input type="number" id="quantity" name="quantity" value={formState.quantity} onChange={handleInputChange} /><br /><br />
    <label htmlFor="category">Category:</label>
    <select id="category" value={formState.category} onChange={handleCategoryChange}>
    <option value="">Select Category</option>
    {Object.keys(options).map((categoryOption) => (
      <option key={categoryOption} value={categoryOption}>
      {categoryOption}
      </option>
    ))}
    </select>
    
    <br /><br />
    
    
    <label htmlFor="subCategory">SubCategory:</label>
    <select id="subCategory" value={formState.subCategory} onChange={handleSubCategoryChange} disabled={!category}>
    <option value="">Select SubCategory</option>
    {category && Object.keys(options[category]).map((subCategoryOption) => (
      <option key={subCategoryOption} value={subCategoryOption}>
      {subCategoryOption}
      </option>
    ))}
    </select>
    
    <br /><br />
    
    <label htmlFor="voting">Voting:</label>
    <select id="voting" value={formState.voting} onChange={(e) => setVoting(e.target.value)} disabled={votingOptions.length === 0}>
    <option value="">Select Voting</option>
    {votingOptions.map((votingOption) => (
      <option key={votingOption} value={votingOption}>
      {votingOption}
      </option>
    ))}
    </select>
    
    <br /><br />
    
    <label htmlFor="vesting">Vesting:</label>
    <select id="vesting" value={formState.vesting} onChange={(e) => setVesting(e.target.value)} disabled={vestingOptions.length === 0}>
    <option value="">Select Vesting</option>
    {vestingOptions.map((vestingOption) => (
      <option key={vestingOption} value={vestingOption}>
      {vestingOption}
      </option>
    ))}
    </select>
    <br /><br />
    <label htmlFor="price">Price:</label><br />
    <select id="price" name="price" value={formState.price} onChange={handleInputChange}>
    <option value="Market Price">Market Price</option>
    <option value="No price">No price</option>
    </select><br /><br />
    <input type="submit" value="Submit" />
    </form>
    
    <h2>Shares in organsation</h2>
    <table>
    <thead>
    <tr>
    <th>Name</th>
    <th>Quantity</th>
    <th>Share Category</th>
    <th>SubCategory</th>
    <th>Voting</th>
    <th>Vesting</th>
    <th>Price</th>
    <th>Actions</th>
    </tr>
    </thead>
    <tbody>
    {shareholdings.map((shareholding, index) => (
      <tr key={index}>
      <td>{shareholding.name}</td>
      <td>{shareholding.quantity}</td>
      <td>{shareholding.category}</td>
      <td>{shareholding.subCategory}</td>
      <td>{shareholding.voting}</td>
      <td>{shareholding.vesting}</td>
      <td>{shareholding.price}</td>
      <td>
      <button onClick={() => handleEdit(index)}>Edit</button>
      <button onClick={() => handleDelete(index)}>Delete</button>
      </td>
      </tr>
    ))}
    </tbody>
    </table>
    </div>
  );
};