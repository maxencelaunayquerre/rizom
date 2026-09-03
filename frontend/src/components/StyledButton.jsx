

const StyledButton = ({ message, onClick, customStyle = "" }) => (
    <button className={"w-full text-2xl font-bold bg-rizom-color m-2 p-3 rounded-lg transition ease-in-out hover:scale-105 duration-150 select-none " + customStyle} onClick={onClick}>{message}</button>
)

export default StyledButton;