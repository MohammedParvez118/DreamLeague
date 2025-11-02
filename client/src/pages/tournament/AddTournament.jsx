import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tournamentAPI } from '../../services/api';
import './AddTournament.css';

function AddTournament() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    seriesType: '',
    year: new Date().getFullYear(),
    seriesId: '',
    seriesName: '',
    startDt: '',
    endDt: ''
  });
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const seriesTypes = ['international', 'league', 'domestic', 'women'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleTypeYearChange = async (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    // If both type and year are selected, fetch series
    if ((field === 'seriesType' && value && formData.year) || 
        (field === 'year' && value && formData.seriesType)) {
      const type = field === 'seriesType' ? value : formData.seriesType;
      const year = field === 'year' ? value : formData.year;
      
      try {
        setLoading(true);
        setError(null);
        const response = await tournamentAPI.getSeries(type, year);
        setSeriesList(response.data.series || []);
      } catch (err) {
        console.error('Error fetching series:', err);
        setError('Failed to fetch series');
        setSeriesList([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSeriesSelect = (e) => {
    const selectedId = e.target.value;
    const selectedSeries = seriesList.find(s => s.id.toString() === selectedId);
    
    if (selectedSeries) {
      setFormData({
        ...formData,
        seriesId: selectedSeries.id,
        seriesName: selectedSeries.name,
        startDt: selectedSeries.startDt,
        endDt: selectedSeries.endDt
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.seriesId || !formData.seriesName) {
      setError('Please select a series');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await tournamentAPI.addTournament(formData);
      
      setSuccess('Tournament added successfully!');
      setTimeout(() => {
        navigate('/home');
      }, 2000);
    } catch (err) {
      console.error('Error adding tournament:', err);
      if (err.response?.status === 409) {
        setError('Tournament already exists');
      } else {
        setError('Failed to add tournament');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-tournament-page">
      <h2>Add Tournament</h2>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="seriesType">Series Type:</label>
          <select
            id="seriesType"
            value={formData.seriesType}
            onChange={(e) => handleTypeYearChange('seriesType', e.target.value)}
            required
          >
            <option value="">Select Type</option>
            {seriesTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="year">Year:</label>
          <select
            id="year"
            value={formData.year}
            onChange={(e) => handleTypeYearChange('year', e.target.value)}
            required
          >
            <option value="">Select Year</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {loading && <p className="loading-text">Loading series...</p>}

        {seriesList.length > 0 && (
          <div className="form-group">
            <label htmlFor="series">Select Series:</label>
            <select
              id="series"
              value={formData.seriesId}
              onChange={handleSeriesSelect}
              required
            >
              <option value="">Select a Series</option>
              {seriesList.map(series => (
                <option key={series.id} value={series.id}>
                  {series.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.seriesName && (
          <div className="selected-series">
            <strong>Selected:</strong> {formData.seriesName}
          </div>
        )}

        <button 
          type="submit" 
          className="btn" 
          disabled={loading || !formData.seriesId}
        >
          {loading ? 'Adding...' : 'Add Tournament'}
        </button>
      </form>
    </div>
  );
}

export default AddTournament;