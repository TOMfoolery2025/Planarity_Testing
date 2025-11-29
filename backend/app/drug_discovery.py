import logging
import json
from typing import Dict, Any, Optional, Union, List
from concurrent.futures import Executor
import asyncio

# RDKit imports
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors

import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not found in environment variables.")

logger = logging.getLogger(__name__)

def analyze_molecule(smiles: str) -> Dict[str, Any]:
    """
    Analyzes a molecule given its SMILES string using RDKit.
    This is a CPU-bound task suitable for ProcessPoolExecutor.
    """
    try:
        mol = Chem.MolFromSmiles(smiles)
        if not mol:
            return {"valid": False, "error": "Invalid SMILES string"}

        # Calculate properties
        mol_wt = Descriptors.MolWt(mol)
        logp = Descriptors.MolLogP(mol)
        hbd = Descriptors.NumHDonors(mol)
        hba = Descriptors.NumHAcceptors(mol)
        tpsa = Descriptors.TPSA(mol)
        rotatable_bonds = Descriptors.NumRotatableBonds(mol)
        
        # Lipinski's Rule of 5 check
        lipinski_violations = 0
        if mol_wt > 500: lipinski_violations += 1
        if logp > 5: lipinski_violations += 1
        if hbd > 5: lipinski_violations += 1
        if hba > 10: lipinski_violations += 1

        # Generate 3D coordinates
        mol_3d = Chem.AddHs(mol)
        from rdkit.Chem import AllChem
        AllChem.EmbedMolecule(mol_3d, AllChem.ETKDG())
        
        # Extract atoms and bonds for 3D rendering
        atoms = []
        conf = mol_3d.GetConformer()
        for atom in mol_3d.GetAtoms():
            pos = conf.GetAtomPosition(atom.GetIdx())
            atoms.append({
                "symbol": atom.GetSymbol(),
                "x": pos.x,
                "y": pos.y,
                "z": pos.z,
                "color": get_atom_color(atom.GetSymbol())
            })
            
        bonds = []
        for bond in mol_3d.GetBonds():
            start_idx = bond.GetBeginAtomIdx()
            end_idx = bond.GetEndAtomIdx()
            start_pos = conf.GetAtomPosition(start_idx)
            end_pos = conf.GetAtomPosition(end_idx)
            bonds.append({
                "start": {"x": start_pos.x, "y": start_pos.y, "z": start_pos.z},
                "end": {"x": end_pos.x, "y": end_pos.y, "z": end_pos.z},
                "order": bond.GetBondTypeAsDouble()
            })

        return {
            "valid": True,
            "smiles": smiles,
            "properties": {
                "molecular_weight": round(mol_wt, 2),
                "logp": round(logp, 2),
                "hbd": hbd,
                "hba": hba,
                "tpsa": round(tpsa, 2),
                "rotatable_bonds": rotatable_bonds,
            },
            "lipinski": {
                "violations": lipinski_violations,
                "passes": lipinski_violations <= 1
            },
            "structure_3d": {
                "atoms": atoms,
                "bonds": bonds
            }
        }
    except Exception as e:
        logger.error(f"Error analyzing molecule: {e}")
        return {"valid": False, "error": str(e)}

def get_atom_color(symbol: str) -> str:
    # CPK coloring convention
    colors = {
        "C": "#909090", # Carbon - Grey
        "H": "#FFFFFF", # Hydrogen - White
        "O": "#FF0D0D", # Oxygen - Red
        "N": "#3050F8", # Nitrogen - Blue
        "S": "#FFFF30", # Sulfur - Yellow
        "P": "#FFA500", # Phosphorus - Orange
        "F": "#90E050", # Fluorine - Green
        "Cl": "#1FF01F", # Chlorine - Green
        "Br": "#A62929", # Bromine - Dark Red
        "I": "#940094", # Iodine - Violet
    }
    return colors.get(symbol, "#FF00FF") # Default Magenta

async def generate_llm_response(analysis: Union[Optional[Dict[str, Any]], List[Dict[str, Any]]], user_query: str) -> str:
    """
    Generates a response using Google Gemini based on the analysis and user query.
    """
    if not GEMINI_API_KEY:
        return "Error: GEMINI_API_KEY not configured."

    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        system_prompt = (
            "You are an expert Pharmaceutical Scientist and Chemist assistant designed to aid in drug discovery. "
            "Your role is to analyze molecular properties, explain structure-activity relationships (SAR), and suggest optimizations.\n"
            "Guidelines:\n"
            "- Be scientific, precise, and professional.\n"
            "- If a molecule is analyzed, interpret its properties (MW, LogP, Lipinski rules) in the context of drug-likeness.\n"
            "- If multiple molecules are provided, COMPARE them. Highlight the best candidates based on drug-likeness and the user's query.\n"
            "- Highlight potential risks (e.g., toxicity, poor solubility) or benefits.\n"
            "- If no molecule is provided, answer general chemistry questions or ask for a SMILES string.\n"
            "- Keep responses concise and actionable."
        )

        prompt_parts = [system_prompt]

        if analysis:
            if isinstance(analysis, list):
                # Batch Analysis Context
                context = "Batch Analysis of Molecules:\n"
                for i, res in enumerate(analysis):
                    if res.get("valid"):
                        props = res['properties']
                        lip = res['lipinski']
                        context += (
                            f"\nMolecule {i+1} (SMILES: {res['smiles']}):\n"
                            f"- MW: {props['molecular_weight']}, LogP: {props['logp']}, "
                            f"HBD: {props['hbd']}, HBA: {props['hba']}, TPSA: {props['tpsa']}\n"
                            f"- Lipinski: {'Pass' if lip['passes'] else 'Fail'} ({lip['violations']} violations)\n"
                        )
                    else:
                        context += f"\nMolecule {i+1} (SMILES: {res.get('smiles', 'Unknown')}): Invalid or Error ({res.get('error')})\n"
                prompt_parts.append(f"Context:\n{context}\n\nUser Query: {user_query}")
            elif isinstance(analysis, dict) and analysis.get("valid"):
                # Single Molecule Context
                props = analysis['properties']
                lip = analysis['lipinski']
                context = (
                    f"Current Molecule Analysis (SMILES: {analysis['smiles']}):\n"
                    f"- Molecular Weight: {props['molecular_weight']} g/mol\n"
                    f"- LogP: {props['logp']}\n"
                    f"- H-Bond Donors: {props['hbd']}\n"
                    f"- H-Bond Acceptors: {props['hba']}\n"
                    f"- TPSA: {props['tpsa']}\n"
                    f"- Lipinski Rule of 5: {'Passes' if lip['passes'] else 'Fails'} ({lip['violations']} violations)\n"
                )
                prompt_parts.append(f"Context:\n{context}\n\nUser Query: {user_query}")
        else:
            prompt_parts.append(f"User Query: {user_query}")

        response = await model.generate_content_async(prompt_parts)
        
        return response.text
    except Exception as e:
        logger.error(f"Error calling Gemini: {e}")
        return f"Error generating response: {str(e)}"
