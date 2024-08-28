import React, { useState } from 'react';

export default function DemoShareEntryForm() {
    const [shareholdings, setShareholdings] = useState([]);
    const [formState, setFormState] = useState({
      name: '',
      quantity: '',
      shareCategory: '',
      subcategory: '',
      voting: '',
      vesting: '',
      price: 'Market Price',
      editIndex: null
    });
    const [showSubcategory, setShowSubcategory] = useState(false);
    const [showVoting, setShowVoting] = useState(false);
    const [showVesting, setShowVesting] = useState(false);
  
    const data = {
      "Common": {
        "Ordinary (Class A)": { "Voting": "Voting", "Vesting": "not applicable" },
        "Ordinary (Class B)": { "Voting": "Super-voting", "Vesting": "not applicable" },
        "Ordinary (Class C)": { "Voting": "Non-voting", "Vesting": "not applicable" },
        "Limited": { "Voting": "not applicable", "Vesting": "not applicable" }
      },
      "Preferred": {
        "Cumulative": { "Voting": "not applicable", "Vesting": "not applicable" },
        "Non-cumulative": { "Voting": "not applicable", "Vesting": "not applicable" },
        "Participating": { "Voting": "not applicable", "Vesting": "not applicable" },
        "Convertible": { "Voting": "not applicable", "Vesting": "not applicable" }
      },
      "Restricted": {
        "Stock Unit": [
          { "Voting": "Voting when exercised", "Vesting": "Graded vesting" },
          { "Voting": "Voting when exercised", "Vesting": "Cliff vesting" },
          { "Voting": "Voting when exercised", "Vesting": "Immediate vesting" }
        ],
        "Stock Award": [
          { "Voting": "Voting", "Vesting": "Graded vesting" },
          { "Voting": "Voting", "Vesting": "Cliff vesting" },
          { "Voting": "Voting", "Vesting": "Immediate vesting" }
        ],
        "Employee Stock Option": [
          { "Voting": "Voting when exercised", "Vesting": "Graded vesting" },
          { "Voting": "Voting when exercised", "Vesting": "Cliff vesting" },
          { "Voting": "Voting when exercised", "Vesting": "Immediate vesting" }
        ]
      }
    };
  
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormState({
        ...formState,
        [name]: value
      });
    };
  
    const handleShareCategoryChange = (e) => {
      const selectedCategory = e.target.value;
      setFormState({
        ...formState,
        shareCategory: selectedCategory,
        subcategory: '',
        voting: '',
        vesting: ''
      });
      setShowSubcategory(false);
      setShowVoting(false);
      setShowVesting(false);
  
      if (selectedCategory && data[selectedCategory]) {
        setShowSubcategory(true);
      }
    };
  
    const handleSubcategoryChange = (e) => {
      const selectedSubcategory = e.target.value;
      setFormState({
        ...formState,
        subcategory: selectedSubcategory,
        voting: '',
        vesting: ''
      });
      setShowVoting(false);
      setShowVesting(false);
  
      if (formState.shareCategory && selectedSubcategory && data[formState.shareCategory][selectedSubcategory]) {
        const options = data[formState.shareCategory][selectedSubcategory];
        if (Array.isArray(options)) {
          setFormState({
            ...formState,
            votingOptions: options.map(option => option.Voting),
            vestingOptions: options.map(option => option.Vesting)
          });
          setShowVoting(true);
          setShowVesting(true);
        } else {
          setFormState({
            ...formState,
            voting: options.Voting,
            vesting: options.Vesting
          });
          if (options.Voting !== "not applicable") {
            setShowVoting(true);
          }
          if (options.Vesting !== "not applicable") {
            setShowVesting(true);
          }
        }
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
      setFormState({
        name: '',
        quantity: '',
        shareCategory: '',
        subcategory: '',
        voting: '',
        vesting: '',
        price: 'Market Price',
        editIndex: null
      });
    };
  
    const handleEdit = (index) => {
      setFormState({ ...shareholdings[index], editIndex: index });
    };
  
    const handleDelete = (index) => {
      const updatedShareholdings = [...shareholdings];
      updatedShareholdings.splice(index, 1);
      setShareholdings(updatedShareholdings);
    };
  
    const styles = {
      hidden: {
        display: 'none'
      },
      visible: {
        display: 'block'
      }
    };
  
    return (
      <div>
        {/* <h1>Share Entry Form</h1> */}
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Name:</label><br />
          <input type="text" id="name" name="name" value={formState.name} onChange={handleInputChange} /><br /><br />
  
          <label htmlFor="quantity">Quantity of Shares:</label><br />
          <input type="number" id="quantity" name="quantity" value={formState.quantity} onChange={handleInputChange} /><br /><br />
  
          <label htmlFor="shareCategory">Share Category:</label><br />
          <select id="shareCategory" name="shareCategory" value={formState.shareCategory} onChange={handleShareCategoryChange}>
            <option value="">Select Category</option>
            <option value="Common">Common</option>
            <option value="Preferred">Preferred</option>
            <option value="Restricted">Restricted</option>
          </select><br /><br />
  
          <div style={showSubcategory ? styles.visible : styles.hidden}>
            <label htmlFor="subcategory">Subcategory of Shares:</label><br />
            <select id="subcategory" name="subcategory" value={formState.subcategory} onChange={handleSubcategoryChange}>
              <option value="">Select Subcategory</option>
              {formState.shareCategory && data[formState.shareCategory] && Object.keys(data[formState.shareCategory]).map(subcategory => (
                <option key={subcategory} value={subcategory}>{subcategory}</option>
              ))}
            </select><br /><br />
          </div>
  
          <div style={showVoting ? styles.visible : styles.hidden}>
            <label htmlFor="voting">Voting:</label><br />
            <select id="voting" name="voting" value={formState.voting} onChange={handleInputChange}>
              <option value="">Select Voting</option>
              {formState.votingOptions && formState.votingOptions.map((voting, index) => (
                <option key={index} value={voting}>{voting}</option>
              ))}
            </select><br /><br />
          </div>
  
          <div style={showVesting ? styles.visible : styles.hidden}>
            <label htmlFor="vesting">Vesting:</label><br />
            <select id="vesting" name="vesting" value={formState.vesting} onChange={handleInputChange}>
              <option value="">Select Vesting</option>
              {formState.vestingOptions && formState.vestingOptions.map((vesting, index) => (
                <option key={index} value={vesting}>{vesting}</option>
              ))}
            </select><br /><br />
          </div>
  
          <label htmlFor="price">Price:</label><br />
          <select id="price" name="price" value={formState.price} onChange={handleInputChange}>
            <option value="Market Price">Market Price</option>
            <option value="No price">No price</option>
          </select><br /><br />
  
          <input type="submit" value="Submit" />
        </form>
  
        <h2>Shareholdings</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Quantity</th>
              <th>Share Category</th>
              <th>Subcategory</th>
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
                <td>{shareholding.shareCategory}</td>
                <td>{shareholding.subcategory}</td>
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