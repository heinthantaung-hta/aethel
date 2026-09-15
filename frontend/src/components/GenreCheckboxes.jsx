export default function GenreCheckboxes({ genres, selected, onChange }) {
  const toggle = (genreId) => {
    if (selected.includes(genreId)) onChange(selected.filter((id) => id !== genreId));
    else onChange([...selected, genreId]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => {
        const isChecked = selected.includes(genre.genre_id);
        return (
          <label key={genre.genre_id}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all border"
            style={isChecked
              ? { background: 'rgba(229,9,20,0.12)', color: '#E50914', borderColor: 'rgba(229,9,20,0.35)' }
              : { background: 'transparent', color: '#A0A4AE', borderColor: '#2C313A' }}
            onMouseEnter={e => { if (!isChecked) { e.currentTarget.style.borderColor = 'rgba(229,9,20,0.3)'; e.currentTarget.style.color = '#E50914'; } }}
            onMouseLeave={e => { if (!isChecked) { e.currentTarget.style.borderColor = '#2C313A'; e.currentTarget.style.color = '#A0A4AE'; } }}>
            <input type="checkbox" checked={isChecked} onChange={() => toggle(genre.genre_id)} className="sr-only" />
            {/* Custom checkbox */}
            <span className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0"
              style={isChecked
                ? { background: '#E50914', borderColor: '#E50914' }
                : { background: 'transparent', borderColor: '#2C313A' }}>
              {isChecked && (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {genre.genre_name}
          </label>
        );
      })}
    </div>
  );
}
